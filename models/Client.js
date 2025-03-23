const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    client_id: { 
        type: String, 
        unique: true 
    },
    client_secret: String,
    client_name: String,
    redirect_uris: [String],
    application_type: String,
    contact_email: String,
    creation_date: Date,
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'active'
    }
});

module.exports = mongoose.model('Client', ClientSchema); 