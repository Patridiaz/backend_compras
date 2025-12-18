import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar el "Transporter" (el servidor SMTP)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // true para 465, false para otros puertos como 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Función principal para enviar correos
   * @param toEmail - Correo del destinatario
   * @param subject - Asunto del correo
   * @param htmlContent - Contenido HTML del correo (desde una plantilla)
   */
  async sendNotification(toEmail: string, subject: string, htmlContent: string): Promise<boolean> {
    const mailOptions = {
      from: `"Sistema de Compras" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Correo enviado con éxito a ${toEmail}. ID del mensaje: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al enviar correo con Nodemailer a ${toEmail}:`, error);
      return false;
    }
  }
}
