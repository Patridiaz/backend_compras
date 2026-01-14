// src/email/email.templates.ts

// Asegúrese de configurar esta URL en sus variables de entorno
export const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Interfaz para asegurar la uniformidad de los datos que van a la plantilla
export interface EmailTemplateData {
  solicitudId: number;
  numeroSolicitud: string;
  subject: string;
  headerColor: string;
  title: string;
  bodyHtml: string;
  buttonText?: string;
  buttonLink?: string;
  // Campos adicionales para detalles
  materia?: string;
  establecimiento?: string;
  fechaSolicitud?: string;
  fondo?: string;
  modalidad?: string;
  currentStatusId?: number; // Para controlar el stepper
}

// ⭐️ FUNCIÓN PRINCIPAL DE PLANTILLA ⭐️
export function generateEmailHtml(data: EmailTemplateData): string {
  // Definir pasos del stepper (ORDEN SOLICITADO: revisión area, finanzas, jefa, compras, finalizada)
  const steps = [
    { id: 1, label: 'Revisión Área', statusIds: [1, 3, 4, 10] }, // 1: Ingreso, 3: Revisión, 4: Borrador, 10: Corrección
    { id: 2, label: 'Finanzas', statusIds: [7] },
    { id: 3, label: 'Jefatura', statusIds: [9] },
    { id: 4, label: 'Compras', statusIds: [8] },
    { id: 5, label: 'Finalizada', statusIds: [2, 5] }
  ];

  // Determinar paso activo (0-4)
  let activeStepIndex = 0;
  const currentId = data.currentStatusId || 1;
  
  if (currentId === 6 || currentId === 11) {
    activeStepIndex = -1; 
  } else {
    // Buscar en qué paso estamos
    activeStepIndex = steps.findIndex(step => step.statusIds.includes(currentId));
    
    // Fallback logic
    if (activeStepIndex === -1) {
       // Si no está mapeado, intentamos deducir
       // Jefa (9) -> index 2
       // Compras (8) -> index 3
       if (currentId === 9) activeStepIndex = 2;
       else if (currentId === 8) activeStepIndex = 3;
       else if (currentId > 9) activeStepIndex = 4; // Final
       else activeStepIndex = 0;
    }
  }

  // Generar HTML del Stepper
  const stepperHtml = steps.map((step, index) => {
    let circleColor = '#e9ecef'; // Futuro (Gris)
    let textColor = '#adb5bd';
    let checkIcon = `<span style="display:inline-block; width:8px; height:8px; background:#adb5bd; border-radius:50%;"></span>`;

    // Pasado o Presente
    if (index <= activeStepIndex) {
        circleColor = '#28a745'; // Verde éxito
        textColor = '#28a745';
        checkIcon = `<span style="color:white; font-size:10px; font-weight:bold;">✓</span>`;
        
        // Si es el paso actual exacto
        if (index === activeStepIndex) {
             circleColor = '#007bff'; // Azul actual
             textColor = '#007bff';
             checkIcon = `<span style="color:white; font-size:10px; font-weight:bold;">●</span>`;
        }
    }
    
    // Línea conectora
    let lineObj = '';
    if (index < steps.length - 1) {
        const lineColor = index < activeStepIndex ? '#28a745' : '#e9ecef';
        lineObj = `<div style="position:absolute; top:12px; left:50%; width:100%; height:2px; background:${lineColor}; z-index:0;"></div>`;
    }

    return `
      <td style="width:20%; position:relative; text-align:center; vertical-align:top; padding-bottom:10px;">
        ${lineObj}
        <div style="position:relative; z-index:1; margin:0 auto; width:24px; height:24px; background:${circleColor}; border-radius:50%; line-height:24px; text-align:center;">
             ${checkIcon}
        </div>
        <div style="margin-top:8px; font-size:11px; color:${textColor}; font-weight:600; font-family:sans-serif;">
            ${step.label}
        </div>
      </td>
    `;
  }).join('');


  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.subject}</title>
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f8f9fa;
                color: #333333;
                line-height: 1.6;
            }
            .email-wrapper { 
                max-width: 680px; 
                margin: 40px auto; 
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                border: 1px solid #eaeaea;
            }
            /* Header Minimalista */
            .header-bar {
                padding: 24px 40px;
                background-color: #ffffff;
                border-bottom: 1px solid #f0f0f0;
            }
            .logo-table { width: 100%; }
            .logo-img { max-height: 50px; width: auto; max-width: 120px; }
            
            /* Título y Estado */
            .title-section {
                padding: 30px 40px 10px 40px;
                text-align: center;
            }
            .main-title {
                font-size: 20px;
                font-weight: 700;
                color: #1a1a1a;
                margin: 0 0 8px 0;
            }
            .solicitud-badge {
                display: inline-block;
                background-color: #f1f3f5;
                color: #495057;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            
            /* Stepper Container */
            .stepper-container {
                padding: 20px 40px;
                background-color: #ffffff;
            }

            /* Contenido */
            .content-section {
                padding: 20px 40px 40px 40px;
            }
            .body-text {
                font-size: 16px; 
                color: #444; 
                margin-bottom: 24px;
            }
            
            /* Detalles Card Elegante */
            .details-card {
                background-color: #fafbfc;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 24px;
                margin-top: 20px;
            }
            .details-title {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #868e96;
                margin-bottom: 16px;
                font-weight: 700;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 8px;
            }
            .detail-row {
                margin-bottom: 10px;
                font-size: 14px;
            }
            .detail-label {
                color: #6c757d;
                font-weight: 500;
                min-width: 120px;
                display: inline-block;
            }
            .detail-value {
                color: #212529;
                font-weight: 600;
            }

            /* Footer */
            .footer {
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            .footer-text {
                font-size: 12px;
                color: #adb5bd;
                margin: 4px 0;
            }
            
            @media only screen and (max-width: 600px) {
                .email-wrapper { margin: 0; border: none; border-radius: 0; }
                .header-bar, .title-section, .stepper-container, .content-section { padding: 20px; }
                .logo-img { max-height: 40px; }
                .stepper-container { display: none; } /* Ocultar stepper en móviles muy pequeños si es complejo */
                .detail-label { display: block; margin-bottom: 2px; }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <!-- Header con Logos (Gris muy claro / Blanco) -->
            <div class="header-bar">
                <table class="logo-table" role="presentation">
                    <tr>
                        <td align="left"><img src="https://i.imgur.com/n3BOqFP.png" class="logo-img" alt="Logo"></td>
                        <td align="right"><img src="https://i.imgur.com/LmPn761.png" class="logo-img" alt="Logo"></td>
                    </tr>
                </table>
            </div>

            <!-- Título Principal -->
            <div class="title-section">
                <h1 class="main-title">${data.title}</h1>
                <span class="solicitud-badge">Solicitud N° ${data.numeroSolicitud}</span>
            </div>

            <!-- Stepper de Progreso -->
            <div class="stepper-container">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                        ${stepperHtml}
                    </tr>
                </table>
            </div>

            <!-- Contenido y Detalles -->
            <div class="content-section">
                <div class="body-text">
                    ${data.bodyHtml}
                </div>

                <div class="details-card">
                    <div class="details-title">Resumen de la Solicitud</div>
                    ${data.materia ? `<div class="detail-row"><span class="detail-label">Materia:</span> <span class="detail-value">${data.materia}</span></div>` : ''}
                    ${data.establecimiento ? `<div class="detail-row"><span class="detail-label">Establecimiento:</span> <span class="detail-value">${data.establecimiento}</span></div>` : ''}
                    ${data.fechaSolicitud ? `<div class="detail-row"><span class="detail-label">Fecha Ingreso:</span> <span class="detail-value">${data.fechaSolicitud}</span></div>` : ''}
                    ${data.fondo ? `<div class="detail-row"><span class="detail-label">Fondo:</span> <span class="detail-value">${data.fondo}</span></div>` : ''}
                    ${data.modalidad ? `<div class="detail-row"><span class="detail-label">Modalidad:</span> <span class="detail-value">${data.modalidad}</span></div>` : ''}
                </div>
                
                <!--
                <div style="text-align:center; margin-top:30px;">
                     <a href="${data.buttonLink || '#'}" style="background-color:#0d6efd; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; font-size:14px; display:inline-block;">Ver Solicitud en Sistema</a>
                </div>
                -->
            </div>

            <!-- Footer -->
            <div class="footer">
                <p style="font-weight:700; color:#495057; font-size:14px; margin-bottom:8px;">Sistema de Gestión de Compras</p>
                <p class="footer-text">Municipalidad de Huechuraba</p>
                <p class="footer-text">Este es un mensaje automático, por favor no responder.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Helper para ajustar el color (oscurecer/aclarar)
function adjustColor(color: string, amount: number): string {
  const clamp = (num: number) => Math.min(Math.max(num, 0), 255);
  const num = parseInt(color.replace('#', ''), 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00FF) + amount);
  const b = clamp((num & 0x0000FF) + amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
