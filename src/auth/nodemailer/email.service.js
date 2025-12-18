const nodemailer = require('nodemailer');


// 1. Configurar el "Transporter" (el servidor SMTP)
// Usaremos credenciales almacenadas en variables de entorno por seguridad
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // Ej: 'smtp.office365.com' para Outlook
  port: process.env.SMTP_PORT || 465, // Puerto SSL/TLS para Gmail
  secure: true, // true para 465, false para otros puertos como 587
  auth: {
    user: process.env.SMTP_USER, // Tu dirección de correo SMTP (Ej: tu-app@gmail.com)
    pass: process.env.SMTP_PASS, // ⭐️ La Contraseña de Aplicación de Gmail
  },
});

/**
 * Función principal para enviar correos
 * @param {string} toEmail - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} htmlContent - Contenido HTML del correo (desde una plantilla)
 */
async function sendNotification(toEmail, subject, htmlContent) {
  const mailOptions = {
    from: `"Sistema de Compras" <${process.env.SMTP_USER}>`, // El remitente visible
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo enviado con éxito a ${toEmail}. ID del mensaje: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error al enviar correo con Nodemailer a ${toEmail}:`, error);
    return false;
  }
}

module.exports = {
  sendNotification,
};