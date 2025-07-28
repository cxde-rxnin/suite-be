# Suite Backend & Smart Contract Data Flow

This document describes the data sent and received by the backend API and the Move smart contract for the Suite hotel booking system.

---

## Backend API (Node.js)

### Endpoints & Data


#### 1. Hotels
- **GET /hotels**
  - **Receives:** None
  - **Sends:** Array of hotel objects:
    - `objectId`: string
    - `name`: string
    - `physical_address`: string
    - `owner`: address
    - `treasury`: number (SUI balance)
    - `imageUrl`: string (image URL, dummy data seeded)

- **POST /api/transactions/hotels/:hotelId/review**
  - **Receives:** `{ reservationId, guest, rating, comment }`
  - **Sends:** The created review object

- **GET /api/transactions/hotels/:hotelId/reviews**
  - **Receives:** None
  - **Sends:** Array of review objects for the hotel

> Dummy hotels, rooms, and reviews (with image URLs) are seeded by the database seeder scripts for development/testing.

#### 2. Rooms
- **GET /hotels/:hotelId/rooms**
  - **Receives:** `hotelId` (URL param)
  - **Sends:** Array of room objects:
    - `objectId`: string
    - `hotel_id`: string
    - `price_per_day`: number
    - `is_booked`: boolean
    - `image_blob_id`: string (Cloudinary URL)

#### 3. Reservations
- **GET /reservations?guestAddress=...**
  - **Receives:** `guestAddress` (query param)
  - **Sends:** Array of reservation objects:
    - `objectId`: string
    - `room_id`: string
    - `hotel_id`: string
    - `guest_address`: address
    - `start_date`: number
    - `end_date`: number
    - `total_cost`: number
    - `is_active`: boolean


#### 4. Transactions (POST endpoints)
- **Create Hotel**
  - **Receives:** `{ name, physicalAddress }`
  - **Sends:** `{ transactionBlock }` (serialized unsigned transaction)
- **List Room**
  - **Receives:** `{ hotelId, pricePerDay }` + image file (multipart)
  - **Sends:** `{ transactionBlock }`
- **Book Room**
  - **Receives:** `{ roomId, hotelId, fullName, email, phone, startDate, endDate, paymentCoinId }`
  - **Sends:** `{ transactionBlock }`
- **Cancel Reservation**
  - **Receives:** `{ reservationId, roomId, hotelId }`
  - **Sends:** `{ transactionBlock }`
- **Leave Review**
  - **Receives:** `{ reservationId, hotelId, rating, comment }`
  - **Sends:** `{ transactionBlock }`
- **Reschedule Reservation**
  - **Receives:** `{ reservationId, roomId, hotelId, newStartDate, newEndDate }`
  - **Sends:** `{ transactionBlock }`

  > This endpoint prepares a transaction to reschedule an existing reservation. The backend uses the following parameters:
  > - `reservationId`: The reservation to update
  > - `roomId`: The room associated with the reservation
  > - `hotelId`: The hotel associated with the reservation
  > - `newStartDate`: The new start date (string)
  > - `newEndDate`: The new end date (string)
  >
  > Returns a serialized unsigned transaction block for the frontend wallet to sign and execute on-chain.

---

## Smart Contract (Move)

### Main Objects
- **Hotel**
  - `id: UID`
  - `name: String`
  - `physical_address: String`
  - `owner: address`
  - `treasury: Balance<SUI>`
- **Room**
  - `id: UID`
  - `hotel_id: ID`
  - `price_per_day: u64`
  - `is_booked: bool`
  - `image_blob_id: String`
- **Reservation**
  - `id: UID`
  - `room_id: ID`
  - `hotel_id: ID`
  - `guest_address: address`
  - `start_date: u64`
  - `end_date: u64`
  - `total_cost: u64`
  - `is_active: bool`
- **Review**
  - `id: UID`
  - `hotel_id: ID`
  - `reservation_id: ID`
  - `guest_address: address`
  - `rating: u8`
  - `comment: String`

### Events Emitted
- `HotelCreated`: hotel_id, name, creator
- `RoomListed`: room_id, hotel_id, price_per_day
- `RoomBooked`: reservation_id, room_id, guest, total_cost
- `ReservationCancelled`: reservation_id, room_id, guest, refund_amount
- `ReviewPosted`: review_id, hotel_id, guest, rating

### Entry Functions & Data
- **create_hotel(name, physical_address, ctx)**
- **list_room(hotel, price_per_day, image_blob_id, ctx)**
- **book_room(room, hotel, start_date, end_date, payment, clock, ctx)**
- **cancel_reservation(reservation, room, hotel, clock, ctx)**
- **leave_review(reservation, hotel_id, rating, comment, clock, ctx)**

---

## Data Flow Summary
- The backend exposes REST endpoints for querying and preparing transactions.
- Data sent to the backend is used to build unsigned transaction blocks for the Sui blockchain.
- The frontend signs and executes these transactions.
- The Move smart contract manages hotels, rooms, reservations, and reviews, emitting events for each major action.

---

For more details, see the respective controller and smart contract source files.

I hope this helps!!!