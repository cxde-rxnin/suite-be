module suite::hotel_booking {
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{Self, String};

    // ============== Constants ==============
    const CANCELLATION_WINDOW: u64 = 86400; // 24 hours in seconds

    // ============== Errors ==============
    const E_ROOM_NOT_AVAILABLE: u64 = 1;
    const E_INVALID_RESERVATION_OWNER: u64 = 2;
    const E_RESERVATION_NOT_ACTIVE: u64 = 3;
    const E_INSUFFICIENT_FUNDS: u64 = 4;
    const E_CANCELLATION_PERIOD_EXPIRED: u64 = 5;
    const E_NOT_HOTEL_OWNER: u64 = 6;
    const E_TREASURY_NOT_EMPTY: u64 = 7;
    const E_USER_HAS_NOT_STAYED: u64 = 8;
    const E_INVALID_DATES: u64 = 9;
    const E_INVALID_RATING: u64 = 10;

    // ============== Events ==============
    public struct HotelCreated has copy, drop {
        hotel_id: ID,
        name: String,
        creator: address,
    }

    public struct RoomListed has copy, drop {
        room_id: ID,
        hotel_id: ID,
        price_per_day: u64,
    }

    public struct RoomBooked has copy, drop {
        reservation_id: ID,
        room_id: ID,
        guest: address,
        total_cost: u64,
    }

    public struct ReservationCancelled has copy, drop {
        reservation_id: ID,
        room_id: ID,
        guest: address,
        refund_amount: u64,
    }

    public struct ReviewPosted has copy, drop {
        review_id: ID,
        hotel_id: ID,
        guest: address,
        rating: u8,
    }

    // ============== Main Objects ==============
    public struct Hotel has key {
        id: UID,
        name: String,
        physical_address: String,
        owner: address,
        treasury: Balance<SUI>,
    }

    public struct Room has key, store {
        id: UID,
        hotel_id: ID,
        price_per_day: u64,
        is_booked: bool,
        image_blob_id: String,
    }

    public struct Reservation has key, store {
        id: UID,
        room_id: ID,
        hotel_id: ID,
        guest_address: address,
        start_date: u64,
        end_date: u64,
        total_cost: u64,
        is_active: bool,
    }

    public struct Review has key {
        id: UID,
        hotel_id: ID,
        reservation_id: ID,
        guest_address: address,
        rating: u8, // 1 to 5
        comment: String,
    }

    // ============== Hotel Owner Functions ==============
    public entry fun create_hotel(
        name: vector<u8>,
        physical_address: vector<u8>,
        ctx: &mut TxContext
    ) {
        let hotel_owner = tx_context::sender(ctx);
        let hotel = Hotel {
            id: object::new(ctx),
            name: string::utf8(name),
            physical_address: string::utf8(physical_address),
            owner: hotel_owner,
            treasury: balance::zero(),
        };

        event::emit(HotelCreated {
            hotel_id: object::id(&hotel),
            name: hotel.name,
            creator: hotel_owner,
        });

        transfer::share_object(hotel);
    }

    public entry fun list_room(
        hotel: &Hotel,
        price_per_day: u64,
        image_blob_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == hotel.owner, E_NOT_HOTEL_OWNER);
        let room = Room {
            id: object::new(ctx),
            hotel_id: object::id(hotel),
            price_per_day: price_per_day,
            is_booked: false,
            image_blob_id: string::utf8(image_blob_id),
        };

        event::emit(RoomListed {
            room_id: object::id(&room),
            hotel_id: object::id(hotel),
            price_per_day: price_per_day,
        });

        transfer::share_object(room);
    }

    public entry fun withdraw_funds(hotel: &mut Hotel, ctx: &mut TxContext) {
        assert!(tx_context::sender(ctx) == hotel.owner, E_NOT_HOTEL_OWNER);
        let amount = balance::value(&hotel.treasury);
        assert!(amount > 0, E_TREASURY_NOT_EMPTY);

        let funds = coin::from_balance(balance::split(&mut hotel.treasury, amount), ctx);
        transfer::public_transfer(funds, hotel.owner);
    }

    // ============== User Functions ==============
    public entry fun book_room(
        room: &mut Room,
        hotel: &mut Hotel,
        start_date: u64,
        end_date: u64,
        payment: &mut Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!room.is_booked, E_ROOM_NOT_AVAILABLE);
        assert!(end_date > start_date, E_INVALID_DATES);
        assert!(start_date > clock::timestamp_ms(clock) / 1000, E_INVALID_DATES);

        let num_days = (end_date - start_date) / 86400;
        let total_cost = room.price_per_day * num_days;
        assert!(coin::value(payment) >= total_cost, E_INSUFFICIENT_FUNDS);

        let payment_balance = coin::balance_mut(payment);
        balance::join(&mut hotel.treasury, balance::split(payment_balance, total_cost));
        room.is_booked = true;

        let reservation = Reservation {
            id: object::new(ctx),
            room_id: object::id(room),
            hotel_id: object::id(hotel),
            guest_address: tx_context::sender(ctx),
            start_date: start_date,
            end_date: end_date,
            total_cost: total_cost,
            is_active: true,
        };

        event::emit(RoomBooked {
            reservation_id: object::id(&reservation),
            room_id: object::id(room),
            guest: reservation.guest_address,
            total_cost: total_cost,
        });

        transfer::public_transfer(reservation, tx_context::sender(ctx));
    }

    public entry fun cancel_reservation(
        reservation: &mut Reservation,
        room: &mut Room,
        hotel: &mut Hotel,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == reservation.guest_address, E_INVALID_RESERVATION_OWNER);
        assert!(reservation.is_active, E_RESERVATION_NOT_ACTIVE);

        let current_time = clock::timestamp_ms(clock) / 1000;
        assert!(current_time < reservation.start_date - CANCELLATION_WINDOW, E_CANCELLATION_PERIOD_EXPIRED);

        let refund_amount = reservation.total_cost;
        let hotel_balance = &mut hotel.treasury;
        let refund_coin = coin::from_balance(balance::split(hotel_balance, refund_amount), ctx);
        transfer::public_transfer(refund_coin, sender);

        reservation.is_active = false;
        room.is_booked = false;

        event::emit(ReservationCancelled {
            reservation_id: object::id(reservation),
            room_id: object::id(room),
            guest: sender,
            refund_amount: refund_amount,
        });
    }

    public entry fun leave_review(
        reservation: &Reservation,
        hotel_id: ID,
        rating: u8,
        comment: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == reservation.guest_address, E_INVALID_RESERVATION_OWNER);
        // Ensure the user can only review after their stay is complete
        assert!(clock::timestamp_ms(clock) / 1000 > reservation.end_date, E_USER_HAS_NOT_STAYED);
        assert!(rating >= 1 && rating <= 5, E_INVALID_RATING);

        let review = Review {
            id: object::new(ctx),
            hotel_id: hotel_id,
            reservation_id: object::id(reservation),
            guest_address: sender,
            rating: rating,
            comment: string::utf8(comment),
        };

        event::emit(ReviewPosted {
            review_id: object::id(&review),
            hotel_id: hotel_id,
            guest: sender,
            rating: rating,
        });

        transfer::share_object(review);
    }
}
