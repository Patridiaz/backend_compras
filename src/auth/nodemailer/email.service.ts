import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Configurar el "Transporter" (el servidor SMTP)
    this.transporter = nodemailer.createTransport({
      host: (this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com').trim(),
      port: parseInt((this.configService.get<string>('SMTP_PORT') || '465').trim()),
      secure: true, // true para 465, false para otros puertos como 587
      auth: {
        user: (this.configService.get<string>('SMTP_USER') || '').trim(),
        pass: (this.configService.get<string>('SMTP_PASS') || '').trim(),
      },
    });
  }

  async onModuleInit() {
    const logPath = join(process.cwd(), 'email_debug.log');
    const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] [EmailService] ${msg}\n`);
    
    try {
      await this.transporter.verify();
      log('Servidor SMTP verificado y listo.');
      console.log('✅ [EmailService] Servidor SMTP verificado y listo.');
    } catch (error) {
      log(`Error al verificar conexión SMTP: ${error.message}`);
      console.error('❌ [EmailService] Error al verificar conexión SMTP:', error);
    }
  }

  /**
   * Función principal para enviar correos
   * @param toEmail - Correo del destinatario
   * @param subject - Asunto del correo
   * @param htmlContent - Contenido HTML del correo (desde una plantilla)
   */
  async sendNotification(toEmail: string, subject: string, htmlContent: string): Promise<boolean> {
    const logPath = join(process.cwd(), 'email_debug.log');
    const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] [EmailService] ${msg}\n`);
    
    const smtpUser = (this.configService.get<string>('SMTP_USER') || '').trim();
    const mailOptions = {
      from: `"Sistema de Compras" <${smtpUser}>`,
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
