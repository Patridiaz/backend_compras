import { Injectable } from '@nestjs/common';
import PdfPrinter = require('pdfmake');
import { SolicitudCompra } from './entities/solicitud-compra.entity';

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

    const docDefinition: any = {
      content: [
                // Encabezado Principal
                {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#003e7e',
                  alignment: 'center',
                  margin: [0, 12],
                  text: 'SOLICITUD DE COMPRA',
                  color: 'white',
                  fontSize: 20,
                  bold: true
                }
              ]
            ]
          },
          layout: 'noBorders'
        },
        {
          text: `Folio: ${solicitud.numero_solicitud}`,
          alignment: 'center',
          style: 'subHeader',
          color: 'white',
        },


        // Información General (2 Columnas con bordes)
        {
          columns: [
            {
              width: '*',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        { text: 'INFORMACIÓN DEL SOLICITANTE', style: 'cardSectionTitle' },
                        {
                          table: {
                            widths: ['auto', '*'],
                            body: [
                              [{ text: 'Solicitante', style: 'label' }, solicitud.solicitante?.name || 'N/A'],
                              [{ text: 'Establecimiento', style: 'label' }, solicitud.establecimiento?.name || 'N/A'],
                              [{ text: 'Fecha', style: 'label' }, new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CL')],
                            ]
                          },
                          layout: 'noBorders'
                        }
                      ],
                      margin: [8, 8, 8, 8]
                    }
                  ]
                ]
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#ddd',
                vLineColor: () => '#ddd',
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0
              }
            },
            {
              width: '*',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        { text: 'ESTADO Y PRESUPUESTO', style: 'cardSectionTitle' },
                        {
                          table: {
                            widths: ['auto', '*'],
                            body: [
                              [{ text: 'Estado Actual', style: 'label' }, { text: solicitud.estadoSolicitud?.nombre || 'N/A', bold: true, color: '#0a7d28' }],
                              [{ text: 'Monto Estimado', style: 'label' }, { text: `$ ${Number(solicitud.monto_estimado).toLocaleString('es-CL')}`, bold: true, fontSize: 11 }],
                            ]
                          },
                          layout: 'noBorders'
                        }
                      ],
                      margin: [8, 8, 8, 8]
                    }
                  ]
                ]
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#ddd',
                vLineColor: () => '#ddd',
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0
              }
            }
          ],
          columnGap: 15
        },

        { text: '\n\n' },

        // Detalles de la Solicitud
        { text: 'DETALLES DE LA SOLICITUD', style: 'sectionHeaderBox' },
          {
            table: {
              widths: ['30%', '*'],
              body: [
                [{ text: 'Materia', style: 'tableHeader' }, solicitud.materia_solicitud || ''],
                [{ text: 'Fundamentos', style: 'tableHeader' }, solicitud.fundamentos_solicitud || ''],
                [{ text: 'Fondo', style: 'tableHeader' }, solicitud.fondo?.nombre || ''],
                [{ text: 'Modalidad', style: 'tableHeader' }, solicitud.modalidad?.nombre || ''],
                [{ text: 'PME', style: 'tableHeader' }, solicitud.pme?.descripcionAccion || 'N/A'],
              ]
            },
            layout: {
              fillColor: (row, node, col) => col === 0 ? '#f7f8fb' : null,
              hLineWidth: () => 0.8,
              vLineWidth: () => 0,
              hLineColor: () => '#ddd'
            }
          },
        { text: '\n\n' },

        // Convenio Marco y Área Revisora
        ...this.buildAdditionalInfo(solicitud),
        { text: '\n\n' },

        // Archivos Adjuntos
        ...this.buildAttachmentsSection(solicitud),
        { text: '\n\n' },

        // Cuentas Presupuestarias
        { text: 'IMPUTACIÓN PRESUPUESTARIA', style: 'sectionHeaderBox' },
        this.buildCuentasTable(solicitud),
        { text: '\n\n' },

        // Información de Compras (si existe)
        ...this.buildPurchaseInfo(solicitud),

        // Observaciones del Área
        ...this.buildObservacionesSection(solicitud),

        // Historial de Aprobaciones
        { text: 'HISTORIAL DE APROBACIONES', style: 'sectionHeaderBox' },
        this.buildAprobacionesInfo(solicitud),
      ],
      styles: {
        mainHeader: {
          fontSize: 22,
          bold: true,
          color: '#003e7e',
          margin: [0, 0, 0, 10]
        },
        subHeader: {
          fontSize: 11,
          color: '#666',
          italics: true,
          margin: [0, -8, 0, 20]
        },
        
        // Sección tipo card con borde
        cardSectionTitle: {
          fontSize: 10,
          bold: true,
          color: '#003e7e',
          margin: [0, 0, 0, 10],
          decoration: 'underline',
          decorationStyle: 'solid',
          decorationColor: '#003e7e'
        },
        
        cardBox: {
          margin: [0, 5, 0, 15],
          border: [false, false, false, false]
        },

        sectionHeaderBox: {
          fontSize: 11,
          bold: true,
          color: 'white',
          fillColor: '#003e7e',
          margin: [0, 15, 0, 10],
          padding: [8, 6],
        },

        label: {
          bold: true,
          fontSize: 9,
          color: '#003e7e',
          margin: [0, 2, 5, 2]
        },

        tableHeader: {
          bold: true,
          fontSize: 10,
          fillColor: '#e9eef5',
          color: '#003e7e',
          margin: [5, 5, 5, 5]
        },

        tableCell: {
          fontSize: 10,
          margin: [5, 5, 5, 5]
        },

        approvalItem: {
          fontSize: 10,
          margin: [0, 3, 0, 3]
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3
      },

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
