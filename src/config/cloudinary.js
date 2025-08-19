import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure the cloudinary SDK with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer-storage-cloudinary
// This tells multer to upload files to a specific folder in your Cloudinary account
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'hotel-booking-app', // You can name this folder whatever you like
        allowed_formats: ['jpeg', 'png', 'jpg'],
    },
});

export {
    cloudinary,
    storage,
};