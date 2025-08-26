import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Configure your SMTP transport here
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

// Enhanced booking confirmation email
export async function sendBookingEmail({ to, subject, bookingSummary, qrData }) {
  try {
    console.log('Generating QR code for booking confirmation...');
    
    // Generate QR code as Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Enhanced HTML template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .booking-details { 
            background-color: #f9f9f9; 
            padding: 25px; 
            border-left: 4px solid #4CAF50;
          }
          .booking-details h2 {
            color: #2c3e50;
            margin-top: 0;
          }
          .qr-section { 
            text-align: center; 
            padding: 30px 20px; 
            background-color: #ffffff;
            border: 2px dashed #ddd; 
            margin: 20px;
            border-radius: 10px;
          }
          .qr-section h3 {
            color: #2c3e50;
            margin-bottom: 15px;
          }
          .footer { 
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
          }
          .footer p {
            margin: 5px 0;
          }
          .footer a {
            color: #3498db;
            text-decoration: none;
          }
          pre { 
            white-space: pre-wrap; 
            word-wrap: break-word; 
            background-color: #fff;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #ddd;
            font-family: 'Courier New', monospace;
            font-size: 14px;
          }
          .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 Booking Confirmed!</h1>
            <p>Your reservation has been successfully processed</p>
          </div>
          
          <div class="booking-details">
            <h2>📋 Booking Details</h2>
            <pre>${bookingSummary}</pre>
          </div>
          
          <div class="highlight">
            <strong>💡 Important:</strong> Please save this email or take a screenshot for easy access during your stay.
          </div>
          
          <div class="qr-section">
            <h3>📱 Check-in QR Code</h3>
            <p>Show this QR code at the hotel reception for quick check-in:</p>
            <img src="${qrCodeDataUrl}" alt="Booking QR Code" style="max-width: 100%; border-radius: 10px;" />
            <p><small style="color: #666;">This QR code contains your reservation details</small></p>
          </div>
          
          <div class="footer">
            <p><strong>Thank you for choosing Suite!</strong></p>
            <p>For support, please contact us with your reservation ID</p>
            <p>Reservation ID: <strong>${qrData.reservationId}</strong></p>
            <p><a href="mailto:support@suite.com">support@suite.com</a> | <a href="tel:+1234567890">+1 (234) 567-890</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text fallback
    const text = `
      SUITE BOOKING CONFIRMATION
      ========================
      
      ${bookingSummary}
      
      Please present your reservation ID (${qrData.reservationId}) at check-in.
      
      For support: support@suite.com | +1 (234) 567-890
      
      Thank you for choosing Suite!
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Suite Bookings <noreply@suite.com>',
      to,
      subject,
      html,
      text,
      attachments: [
        {
          filename: 'booking-qr-code.png',
          content: qrCodeDataUrl.split(',')[1],
          encoding: 'base64',
          cid: 'qr-code'
        }
      ]
    };

    console.log('Sending booking confirmation email to:', to);
    const result = await transporter.sendMail(mailOptions);
    console.log('Booking email sent successfully:', result.messageId);
    
    return result;
  } catch (error) {
    console.error('Booking email sending failed:', error);
    throw new Error(`Failed to send booking email: ${error.message}`);
  }
}

// Cancellation email
export async function sendCancellationEmail({ to, reservationId, guestName, reason }) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Cancellation</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
          }
          .content {
            padding: 30px 20px;
          }
          .footer { 
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Booking Cancelled</h1>
            <p>Your reservation has been successfully cancelled</p>
          </div>
          
          <div class="content">
            <p>Dear ${guestName},</p>
            <p>Your reservation with ID <strong>${reservationId}</strong> has been cancelled.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you have any questions about your cancellation or refund, please contact our support team.</p>
            <p>We hope to serve you again in the future!</p>
          </div>
          
          <div class="footer">
            <p><strong>Suite Customer Support</strong></p>
            <p><a href="mailto:support@suite.com" style="color: #3498db;">support@suite.com</a> | <a href="tel:+1234567890" style="color: #3498db;">+1 (234) 567-890</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Suite Bookings <noreply@suite.com>',
      to,
      subject: 'Booking Cancellation Confirmation - Suite',
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Cancellation email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Cancellation email sending failed:', error);
    throw new Error(`Failed to send cancellation email: ${error.message}`);
  }
}

// Reschedule email
export async function sendRescheduleEmail({ 
  to, 
  reservationId, 
  guestName, 
  oldStartDate, 
  oldEndDate, 
  newStartDate, 
  newEndDate 
}) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Rescheduled</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
          }
          .content {
            padding: 30px 20px;
          }
          .date-comparison {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            gap: 20px;
          }
          .date-box {
            flex: 1;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .old-dates {
            background-color: #ffebee;
            border: 1px solid #ffcdd2;
          }
          .new-dates {
            background-color: #e8f5e8;
            border: 1px solid #c8e6c9;
          }
          .footer { 
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Booking Rescheduled</h1>
            <p>Your reservation dates have been updated</p>
          </div>
          
          <div class="content">
            <p>Dear ${guestName},</p>
            <p>Your reservation with ID <strong>${reservationId}</strong> has been successfully rescheduled.</p>
            
            <div class="date-comparison">
              <div class="date-box old-dates">
                <h4>❌ Previous Dates</h4>
                <p><strong>Check-in:</strong> ${new Date(oldStartDate).toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> ${new Date(oldEndDate).toLocaleDateString()}</p>
              </div>
              <div class="date-box new-dates">
                <h4>✅ New Dates</h4>
                <p><strong>Check-in:</strong> ${new Date(newStartDate).toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> ${new Date(newEndDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <p>Please make note of your new dates. We look forward to hosting you!</p>
          </div>
          
          <div class="footer">
            <p><strong>Suite Customer Support</strong></p>
            <p><a href="mailto:support@suite.com" style="color: #3498db;">support@suite.com</a> | <a href="tel:+1234567890" style="color: #3498db;">+1 (234) 567-890</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Suite Bookings <noreply@suite.com>',
      to,
      subject: 'Booking Rescheduled - Suite',
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Reschedule email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Reschedule email sending failed:', error);
    throw new Error(`Failed to send reschedule email: ${error.message}`);
  }
}

// Generic email template function
export async function sendTemplateEmail({
  to,
  subject,
  title,
  message,
  buttonText,
  buttonUrl,
  footerText = 'Thank you for choosing Suite!'
}) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
          }
          .content {
            padding: 30px 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { 
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          
          <div class="content">
            ${message}
            ${buttonUrl ? `<div style="text-align: center;"><a href="${buttonUrl}" class="button">${buttonText || 'Learn More'}</a></div>` : ''}
          </div>
          
          <div class="footer">
            <p>${footerText}</p>
            <p><a href="mailto:support@suite.com" style="color: #3498db;">support@suite.com</a> | <a href="tel:+1234567890" style="color: #3498db;">+1 (234) 567-890</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Suite <noreply@suite.com>',
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Template email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Template email sending failed:', error);
    throw new Error(`Failed to send template email: ${error.message}`);
  }
}

// Test email function
export async function sendTestEmail(to) {
  return sendTemplateEmail({
    to,
    subject: 'Suite Email Service Test',
    title: '✅ Email Service Working',
    message: '<p>This is a test email to verify that your Suite email service is configured correctly.</p><p>If you received this email, everything is working properly!</p>',
    footerText: 'Suite Email Service Test'
  });
}

// Bulk email function (for newsletters, announcements, etc.)
export async function sendBulkEmails(emails, templateData) {
  const results = [];
  const batchSize = 10; // Send emails in batches to avoid overwhelming SMTP server

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchPromises = batch.map(email => 
      sendTemplateEmail({ ...templateData, to: email }).catch(error => ({ 
        email, 
        error: error.message 
      }))
    );

    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}