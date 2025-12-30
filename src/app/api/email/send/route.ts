import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { sendEmailSchema, validateRequest } from '@/lib/validations';

// POST - Send an email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateRequest(sendEmailSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { to, subject, body: emailBody, from_name, reply_to } = validation.data;

    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Return a special response indicating SMTP is not configured
      // The frontend can fall back to mailto
      return NextResponse.json({
        success: false,
        error: 'SMTP not configured',
        fallback: 'mailto',
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: from_name ? `"${from_name}" <${smtpFrom || smtpUser}>` : smtpFrom || smtpUser,
      replyTo: reply_to || undefined,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>'),
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
