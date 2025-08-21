import mongoose from 'mongoose';

const BedConfigurationSchema = new mongoose.Schema({
    bedType: { 
        type: String, 
        required: true,
        enum: ['king', 'queen', 'double', 'twin', 'single', 'sofa-bed', 'bunk-bed']
    },
    quantity: { 
        type: Number, 
        required: true,
        min: 1
    }
}, { _id: false });

const RoomSchema = new mongoose.Schema({
    // Core identifiers
    objectId: { type: String, required: true, unique: true, index: true },
    hotelId: { type: String, required: true, index: true },
    roomNumber: { type: String, required: true },
    
    // Basic room info
    name: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['standard', 'deluxe', 'suite', 'executive', 'presidential', 'family', 'accessible']
    },
    description: { type: String },
    
    // Guest capacity
    maxGuests: { type: Number, required: true, min: 1 },
    maxAdults: { type: Number, required: true, min: 1 },
    maxChildren: { type: Number, default: 0, min: 0 },
    baseGuestCount: { type: Number, default: 2, min: 1 },
    
    // Room specifications
    bedConfiguration: [BedConfigurationSchema],
    roomSize: { 
        type: Number, 
        required: true,
        min: 1
    }, // in square meters
    bathrooms: { type: Number, default: 1, min: 1 },
    floor: { type: Number, min: 0 },
    view: { 
        type: String,
        enum: ['ocean', 'city', 'garden', 'pool', 'mountain', 'courtyard', 'street', 'interior']
    },
    
    // Pricing
    pricePerDay: { type: Number, required: true, min: 0 },
    extraGuestFee: { type: Number, default: 0, min: 0 }, // fee per additional guest beyond baseGuestCount
    
    // Availability
    isAvailable: { type: Boolean, default: true },
    isBooked: { type: Boolean, default: false },
    
    // Media
    images: [{
        cloudinaryPublicId: { type: String, required: true },
        imageUrl: { type: String, required: true }
    }],
    
    // Features
    amenities: [{ 
        type: String,
        enum: [
            'wifi', 'tv', 'ac', 'heating', 'minibar', 'safe', 'balcony', 
            'kitchenette', 'coffee-maker', 'hair-dryer', 'iron', 'telephone',
            'room-service', 'daily-housekeeping', 'turndown-service'
        ]
    }],
    perks: [{ 
        type: String,
        enum: [
            'free-breakfast', 'late-checkout', 'early-checkin', 'welcome-drink',
            'free-parking', 'airport-shuttle', 'spa-access', 'gym-access',
            'business-center', 'concierge', 'pet-friendly', 'smoking-allowed'
        ]
    }],
    
    // Accessibility
    isAccessible: { type: Boolean, default: false },
    accessibilityFeatures: [{ 
        type: String,
        enum: [
            'wheelchair-accessible', 'hearing-accessible', 'visual-accessible',
            'grab-bars', 'roll-in-shower', 'lowered-fixtures', 'braille-signage'
        ]
    }],
    
    // Policies
    smokingAllowed: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    
}, {
    timestamps: true // adds createdAt and updatedAt
});

// Indexes for better query performance
RoomSchema.index({ hotelId: 1, isAvailable: 1 });
RoomSchema.index({ hotelId: 1, type: 1 });
RoomSchema.index({ hotelId: 1, maxGuests: 1 });
RoomSchema.index({ pricePerDay: 1 });

// Virtual for total sleeping capacity calculation
RoomSchema.virtual('totalSleepingCapacity').get(function() {
    return this.bedConfiguration.reduce((total, bed) => {
        const capacity = {
            'king': 2,
            'queen': 2, 
            'double': 2,
            'twin': 1,
            'single': 1,
            'sofa-bed': 2,
            'bunk-bed': 2
        };
        return total + (capacity[bed.bedType] || 1) * bed.quantity;
    }, 0);
});

// Method to calculate total price for guests
RoomSchema.methods.calculatePrice = function(numberOfGuests = this.baseGuestCount) {
    const extraGuests = Math.max(0, numberOfGuests - this.baseGuestCount);
    return this.pricePerDay + (extraGuests * this.extraGuestFee);
};

// Method to check if room can accommodate guests
RoomSchema.methods.canAccommodate = function(adults = 1, children = 0) {
    const totalGuests = adults + children;
    return totalGuests <= this.maxGuests && 
           adults <= this.maxAdults && 
           children <= this.maxChildren;
};

export default mongoose.model('Room', RoomSchema);