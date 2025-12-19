import { Injectable } from '@nestjs/common';
import PdfPrinter = require('pdfmake');
import { SolicitudCompra } from './entities/solicitud-compra.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SolicitudesPdfService {
  private fonts = {
    Roboto: {
      normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular.woff',
      bold: 'node_modules/roboto-font/fonts/Roboto/roboto-medium.woff',
      italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic.woff',
      bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-mediumitalic.woff',
    },
    // Fallback standard fonts if custom fonts are tricky to load in serverless/some envs
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };

  async generateSolicitudPdf(solicitud: SolicitudCompra): Promise<Buffer> {
    
    const printer = new PdfPrinter({
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      }
    });

    // Carga de imágenes para el encabezado
    const logo1Path = path.join(process.cwd(), 'src/assets/images/logo1.png');
    const logo2Path = path.join(process.cwd(), 'src/assets/images/logo2.png');
    
    let logo1Data: string | null = null;
    let logo2Data: string | null = null;

    try {
        if (fs.existsSync(logo1Path)) {
            logo1Data = `data:image/png;base64,${fs.readFileSync(logo1Path).toString('base64')}`;
        }
        if (fs.existsSync(logo2Path)) {
            logo2Data = `data:image/png;base64,${fs.readFileSync(logo2Path).toString('base64')}`;
        }
    } catch (error) {
        console.warn('Error loading PDF images:', error);
    }

    const docDefinition: any = {
      pageSize: 'LETTER',
      pageMargins: [30, 80, 30, 40], // Top margin increased for header space
      header: {
          margin: [30, 20, 30, 0],
          columns: [
              logo1Data ? { image: logo1Data, width: 100, alignment: 'left' } : { text: '', width: 100 },
              { text: '', width: '*' },
              logo2Data ? { image: logo2Data, width: 60, alignment: 'right' } : { text: '', width: 60 }
          ]
      },
      footer: (currentPage, pageCount) => {
        return {
            margin: [30, 10, 30, 0],
            columns: [
                { text: 'Generado automáticamente por el Sistema de Gestión de Compras', alignment: 'left', fontSize: 8, color: '#888' },
                { text: `Página ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 8, color: '#888' }
            ]
        };
      },
      content: [
         // Título Principal Centrado
         {
           text: 'SOLICITUD DE COMPRA',
           style: 'mainHeader',
           alignment: 'center'
         },
         {
           text: `Folio N°: ${solicitud.numero_solicitud}`,
           alignment: 'center',
           style: 'subHeader'
         },
         { text: '\n' },

         // Información General: Layout de 2 columnas tipo tarjeta
         {
            columns: [
                // Columna Izquierda: Solicitante
                {
                    width: '*',
                    stack: [
                        { text: 'INFORMACIÓN DEL SOLICITANTE', style: 'cardTitle' },
                        {
                            table: {
                                widths: ['35%', '65%'],
                                body: [
                                    [{ text: 'Solicitante:', style: 'label' }, { text: solicitud.solicitante?.name || 'N/A', style: 'value' }],
                                    [{ text: 'Establecimiento:', style: 'label' }, { text: solicitud.establecimiento?.name || 'N/A', style: 'value' }],
                                    [{ text: 'Fecha Solicitud:', style: 'label' }, { text: new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CL'), style: 'value' }]
                                ]
                            },
                            layout: 'noBorders'
                        }
                    ],
                    style: 'infoCard'
                },
                // Columna Derecha: Estado
                {
                    width: '*',
                    stack: [
                        { text: 'ESTADO Y PRESUPUESTO', style: 'cardTitle' },
                        {
                            table: {
                                widths: ['40%', '60%'],
                                body: [
                                    [{ text: 'Estado Actual:', style: 'label' }, { text: solicitud.estadoSolicitud?.nombre || 'N/A', style: 'statusValue', color: '#0a7d28' }],
                                    [{ text: 'Monto Estimado:', style: 'label' }, { text: `$ ${Number(solicitud.monto_estimado).toLocaleString('es-CL')}`, style: 'moneyValue' }]
                                ]
                            },
                            layout: 'noBorders'
                        }
                    ],
                    style: 'infoCard'
                }
            ],
            columnGap: 20,
            margin: [0, 0, 0, 15]
         },

        // Detalles de la Solicitud
        { text: 'DETALLES DE LA SOLICITUD', style: 'sectionHeaderBox' },
          {
            table: {
              widths: ['25%', '*'],
              body: [
                [{ text: 'Materia', style: 'tableLabel' }, { text: solicitud.materia_solicitud || '', style: 'tableValue' }],
                [{ text: 'Fundamentos', style: 'tableLabel' }, { text: solicitud.fundamentos_solicitud || '', style: 'tableValue' }],
                [{ text: 'Fondo', style: 'tableLabel' }, { text: solicitud.fondo?.nombre || '', style: 'tableValue' }],
                [{ text: 'Modalidad', style: 'tableLabel' }, { text: solicitud.modalidad?.nombre || '', style: 'tableValue' }],
                [{ text: 'PME', style: 'tableLabel' }, { text: solicitud.pme?.descripcionAccion || 'N/A', style: 'tableValue' }],
              ]
            },
            layout: {
              fillColor: (row, node, col) => col === 0 ? '#f4f6f9' : null,
              hLineWidth: (i, node) => 1,
              vLineWidth: () => 0,
              hLineColor: () => '#e0e0e0'
            },
            margin: [0, 0, 0, 15]
          },

        // Información Adicional (Helpers)
        ...this.buildAdditionalInfo(solicitud),
        { text: '\n' },

        // Archivos Adjuntos (Helpers)
        ...this.buildAttachmentsSection(solicitud),
        { text: '\n' },

        // Cuentas Presupuestarias (Helpers)
        { text: 'IMPUTACIÓN PRESUPUESTARIA', style: 'sectionHeaderBox' },
        this.buildCuentasTable(solicitud),
        { text: '\n\n' },

        // Información de Compras (Helpers)
        ...this.buildPurchaseInfo(solicitud),

        // Observaciones (Helpers)
        ...this.buildObservacionesSection(solicitud),

        // Aprobaciones (Helpers)
        { text: 'HISTORIAL DE APROBACIONES', style: 'sectionHeaderBox' },
        this.buildAprobacionesInfo(solicitud),
      ],
      styles: {
        mainHeader: {
          fontSize: 18,
          bold: true,
          color: '#003e7e',
          margin: [0, 0, 0, 5]
        },
        subHeader: {
          fontSize: 11,
          color: '#555',
          italics: true,
          margin: [0, 0, 0, 10]
        },
        cardTitle: {
          fontSize: 10,
          bold: true,
          color: '#003e7e',
          decoration: 'underline',
          margin: [0, 0, 0, 5]
        },
        infoCard: {
          margin: [0, 5, 0, 5],
          pad: 5
        },
        sectionHeaderBox: {
          fontSize: 11,
          bold: true,
          color: 'white',
          fillColor: '#003e7e',
          margin: [0, 10, 0, 5],
          padding: [8, 4]
        },
        label: {
          fontSize: 9,
          bold: true,
          color: '#444'
        },
        value: {
          fontSize: 9,
          color: '#000'
        },
        statusValue: {
          fontSize: 9,
          bold: true
        },
        moneyValue: {
          fontSize: 10,
          bold: true,
          color: '#003e7e'
        },
        tableLabel: {
            fontSize: 9,
            bold: true,
            color: '#003e7e',
            margin: [5, 2]
        },
        tableValue: {
            fontSize: 9,
            margin: [5, 2],
            color: '#333'
        },
        // Estilos usados por los helpers (Legacy support)
        tableHeader: {
          bold: true,
          fontSize: 9,
          fillColor: '#e9eef5',
          color: '#003e7e',
          margin: [4, 4, 4, 4]
        },
        tableCell: {
          fontSize: 9,
          margin: [4, 4, 4, 4]
        },
        approvalItem: {
          fontSize: 9,
          margin: [0, 2, 0, 2],
          color: '#333'
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3
      }
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err) => reject(err));
      pdfDoc.end();
    });
  }

  private buildCuentasTable(solicitud: SolicitudCompra) {
    if (!solicitud.cuentasPresupuestarias || solicitud.cuentasPresupuestarias.length === 0) {
      return { text: 'No hay cuentas presupuestarias asignadas.', italics: true, color: '#777777', margin: [10, 0] };
    }

    const body: any[] = [
      [
        { text: 'Cuenta', style: 'tableHeader', alignment: 'center' },
        { text: 'Centro Costo', style: 'tableHeader', alignment: 'center' },
        { text: 'Monto', style: 'tableHeader', alignment: 'right' },
      ],
    ];

    solicitud.cuentasPresupuestarias.forEach((cp) => {
      body.push([
        { text: cp.cuentaPresupuestaria?.codigo || 'N/A', style: 'tableCell', alignment: 'center' },
        { text: cp.centroCosto?.nombre || 'N/A', style: 'tableCell', alignment: 'center' },
        { text: `$ ${Number(cp.montoImputado).toLocaleString('es-CL')}`, style: 'tableCell', alignment: 'right' },
      ]);
    });

    return {
      table: {
        headerRows: 1,
        widths: ['*', '*', 'auto'],
        body: body,
      },
      layout: 'lightHorizontalLines'
    };
  }

  private buildAprobacionesInfo(solicitud: SolicitudCompra) {
    const lines: any[] = [];

    const checkIcon = { text: '✓ ', color: '#0a7d28', bold: true };
    
    if (solicitud.areaAsignado) {
        lines.push({ 
            columns: [
                { width: 'auto', text: checkIcon },
                { text: `Revisado por Área: ${solicitud.areaAsignado.name}`, style: 'approvalItem' }
            ]
        });
    }
    if (solicitud.finAsignado) {
        lines.push({ 
            columns: [
                { width: 'auto', text: checkIcon },
                { text: `Revisado por Finanzas: ${solicitud.finAsignado.name}`, style: 'approvalItem' }
            ]
        });
    }
    if (solicitud.compradorAsignado) {
        lines.push({ 
            columns: [
                { width: 'auto', text: checkIcon },
                { text: `Asignado a Comprador: ${solicitud.compradorAsignado.name}`, style: 'approvalItem' }
            ]
        });
    }
    if (solicitud.jefaDemAsignado) {
        lines.push({ 
            columns: [
                { width: 'auto', text: checkIcon },
                { text: `Resolución Jefa DEM: ${solicitud.jefaDemAprobacion?.nombre} por ${solicitud.jefaDemAsignado.name} el ${solicitud.jefaDemFecha ? new Date(solicitud.jefaDemFecha).toLocaleDateString('es-CL') : ''}`, style: 'approvalItem' }
            ]
        });
    }

    if (lines.length === 0) {
        return { text: 'Sin aprobaciones registradas aún.', italics: true, color: '#777777', margin: [10, 0] };
    }

    return {
        stack: lines,
        margin: [10, 0]
    };
  }

  private buildAdditionalInfo(solicitud: SolicitudCompra): any[] {
    const sections: any[] = [];
    
    const infoRows: any[] = [];
    
    if (solicitud.id_convenio_marco) {
      infoRows.push([
        { text: 'Convenio Marco', style: 'tableHeader' },
        solicitud.id_convenio_marco
      ]);
    }
    
    if (solicitud.areaRevisora) {
      infoRows.push([
        { text: 'Área Revisora', style: 'tableHeader' },
        solicitud.areaRevisora.nombre || 'N/A'
      ]);
    }

    if (infoRows.length > 0) {
      sections.push(
        { text: 'INFORMACIÓN ADICIONAL', style: 'sectionHeaderBox' },
        {
          table: {
            widths: ['30%', '*'],
            body: infoRows
          },
          layout: {
            fillColor: (row, node, col) => col === 0 ? '#f7f8fb' : null,
            hLineWidth: () => 0.8,
            vLineWidth: () => 0,
            hLineColor: () => '#ddd'
          }
        }
      );
    }

    return sections;
  }

  private buildAttachmentsSection(solicitud: SolicitudCompra): any[] {
    const attachments: string[] = [];
    
    if (solicitud.cotizacion) attachments.push('Cotización');
    if (solicitud.terminos_de_referencia) attachments.push('Términos de Referencia');
    if (solicitud.bt) attachments.push('BT');
    if (solicitud.req_compra_agil) attachments.push('Requisitos Compra Ágil');
    if (solicitud.nominas) attachments.push('Nóminas');
    if (solicitud.espec_productos) attachments.push('Especificaciones de Productos');

    if (attachments.length === 0) {
      return [];
    }

    return [
      { text: 'ARCHIVOS ADJUNTOS', style: 'sectionHeaderBox' },
      {
        ul: attachments.map(att => ({ text: att, style: 'approvalItem' })),
        margin: [10, 0]
      }
    ];
  }

  private buildPurchaseInfo(solicitud: SolicitudCompra): any[] {
    const sections: any[] = [];
    const purchaseRows: any[] = [];

    if (solicitud.orden_compra) {
      purchaseRows.push([
        { text: 'Orden de Compra', style: 'tableHeader' },
        solicitud.orden_compra
      ]);
    }

    if (solicitud.numero_cotizacion) {
      purchaseRows.push([
        { text: 'Número de Cotización', style: 'tableHeader' },
        solicitud.numero_cotizacion
      ]);
    }

    if (solicitud.numero_licitacion) {
      purchaseRows.push([
        { text: 'Número de Licitación', style: 'tableHeader' },
        solicitud.numero_licitacion
      ]);
    }

    if (solicitud.comentarios_orden_compra) {
      purchaseRows.push([
        { text: 'Comentarios', style: 'tableHeader' },
        solicitud.comentarios_orden_compra
      ]);
    }

    if (purchaseRows.length > 0) {
      sections.push(
        { text: 'INFORMACIÓN DE COMPRAS', style: 'sectionHeaderBox' },
        {
          table: {
            widths: ['30%', '*'],
            body: purchaseRows
          },
          layout: {
            fillColor: (row, node, col) => col === 0 ? '#f7f8fb' : null,
            hLineWidth: () => 0.8,
            vLineWidth: () => 0,
            hLineColor: () => '#ddd'
          }
        },
        { text: '\n\n' }
      );
    }

    return sections;
  }

  private buildObservacionesSection(solicitud: SolicitudCompra): any[] {
    if (!solicitud.observacionesArea || solicitud.observacionesArea.length === 0) {
      return [];
    }

    const observacionesItems = solicitud.observacionesArea.map(obs => ({
      stack: [
        {
          columns: [
            { 
              width: 'auto', 
              text: `${obs.usuario?.name || 'Usuario'} (${obs.areaRevisora?.nombre || 'Área'}):`, 
              bold: true, 
              fontSize: 9,
              color: '#003e7e'
            },
            { 
              width: 'auto', 
              text: obs.fecha ? new Date(obs.fecha).toLocaleDateString('es-CL') : '', 
              fontSize: 8,
              color: '#666',
              italics: true,
              margin: [5, 0, 0, 0]
            }
          ]
        },
        { 
          text: obs.observacion || '', 
          fontSize: 9, 
          margin: [0, 2, 0, 8],
          color: '#333'
        }
      ],
      margin: [10, 5, 10, 5]
    }));

    return [
      { text: 'OBSERVACIONES', style: 'sectionHeaderBox' },
      {
        stack: observacionesItems
      },
      { text: '\n\n' }
    ];
  }
}
