// Script de prueba para verificar la conexión SMTP
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('=== VERIFICACIÓN DE CONFIGURACIÓN SMTP ===\n');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***configurado***' : '❌ NO CONFIGURADO');
console.log('\n=== INTENTANDO ENVIAR EMAIL DE PRUEBA ===\n');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"Sistema de Compras TEST" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Envía a ti mismo
      subject: '✅ Test de Nodemailer - Sistema de Compras',
      html: '<h1>¡Funciona!</h1><p>El servicio de email está configurado correctamente.</p>',
    });
    
    console.log('✅ ¡EMAIL ENVIADO CON ÉXITO!');
    console.log('Message ID:', info.messageId);
    console.log('\n🎉 La configuración SMTP es correcta.');
  } catch (error) {
    console.error('❌ ERROR AL ENVIAR EMAIL:');
    console.error(error.message);
    console.error('\n📋 Posibles soluciones:');
    console.error('1. Verifica que SMTP_PASS sea la contraseña de aplicación (16 caracteres sin espacios)');
    console.error('2. Asegúrate de que la verificación en 2 pasos esté activada en Gmail');
    console.error('3. Verifica que SMTP_USER sea el email correcto');
    console.error('4. Intenta regenerar la contraseña de aplicación en: https://myaccount.google.com/apppasswords');
  }
}

testEmail();
