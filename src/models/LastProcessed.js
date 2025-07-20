const mongoose = require('mongoose');

// This schema will store a single document to track the state of our indexer.
const LastProcessedSchema = new mongoose.Schema({
    // A unique key for this particular indexer, e.g., "sui_events"
    key: { type: String, required: true, unique: true, index: true },

    // The event sequence number from the Sui RPC response's `nextCursor`
    cursor: { type: String, required: true },
});

module.exports = mongoose.model('LastProcessed', LastProcessedSchema);