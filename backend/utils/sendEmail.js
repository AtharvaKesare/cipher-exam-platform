import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, text }) => {
  try {
    // Ensure credentials exist if trying to use Gmail or custom SMTP
    if (!process.env.EMAIL_USER && process.env.NODE_ENV === 'production') {
      console.warn('EMAIL_USER is not set. Email notifications are skipped.');
      return;
    }

    // Default configuring for testing via ethereal email if explicitly set, or falling back
    let transporter;
    if (process.env.EMAIL_HOST) {
       transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
       });
    } else if (process.env.EMAIL_USER) {
        // Assume Gmail if only user/pass provided
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
       });
    } else {
        console.warn('No email configuration found. Set EMAIL_USER and EMAIL_PASS in .env');
        return;
    }

    const info = await transporter.sendMail({
      from: `"ProctorFlow Notifications" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Email sending error:', error.message);
  }
};
