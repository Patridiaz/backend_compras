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

  /**
   * 🎬 DEMO: el envío de correos solo está activo si EMAIL_ENABLED=true en el .env.
   * Si la variable no existe o tiene otro valor, los correos NO se envían.
   */
  private get emailEnabled(): boolean {
    return (this.configService.get<string>('EMAIL_ENABLED') || 'false').trim().toLowerCase() === 'true';
  }

  async onModuleInit() {
    const logPath = join(process.cwd(), 'email_debug.log');
    const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] [EmailService] ${msg}\n`);

    if (!this.emailEnabled) {
      log('Envío de correos DESHABILITADO (EMAIL_ENABLED != true).');
      console.log('📭 [EmailService] Envío de correos DESHABILITADO (EMAIL_ENABLED != true).');
      return;
    }

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

    if (!this.emailEnabled) {
      log(`[OMITIDO] Correo NO enviado (envío deshabilitado). Para: ${toEmail} | Asunto: ${subject}`);
      console.log(`📭 [EmailService] Correo omitido (envío deshabilitado). Para: ${toEmail} | Asunto: ${subject}`);
      return true; // Se simula éxito para no interrumpir el flujo de la aplicación
    }

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
