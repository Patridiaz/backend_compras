import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MercadoPublicoService {
  private readonly ticket: string;
  private readonly baseUrl = 'https://api.mercadopublico.cl/servicios/v1/publico';

  constructor(private readonly configService: ConfigService) {
    this.ticket = this.configService.get<string>('MERCADO_PUBLICO') || '';
  }

  async getOrdenCompra(codigo: string): Promise<any> {
    if (!codigo || !this.ticket) return null;
    try {
      const url = `${this.baseUrl}/ordenesdecompra.json?codigo=${codigo}&ticket=${this.ticket}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return data.Listado?.[0] || null;
    } catch (error) {
      console.error('Error fetching OC from Mercado Público:', error);
      return null;
    }
  }

  async getLicitacion(codigo: string): Promise<any> {
    if (!codigo || !this.ticket) return null;
    try {
      const url = `${this.baseUrl}/licitaciones.json?codigo=${codigo}&ticket=${this.ticket}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return data.Listado?.[0] || null;
    } catch (error) {
      console.error('Error fetching Licitación from Mercado Público:', error);
      return null;
    }
  }
}
