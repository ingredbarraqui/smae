import { defineStore } from 'pinia';

// eslint-disable-next-line import/no-extraneous-dependencies
import { DashboardItemDto, DashboardLinhasDto } from '@/../../backend/src/dashboard/entities/dashboard.entity';

const baseUrl = `${import.meta.env.VITE_API_URL}`;

type Lista = DashboardLinhasDto['linhas'];

interface ChamadasPendentes {
  lista: boolean;
}

interface Estado {
  lista: Lista;
  chamadasPendentes: ChamadasPendentes;
  erro: null | unknown;
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): Estado => ({
    lista: [],

    chamadasPendentes: {
      lista: true,
    },
    erro: null,
  }),

  actions: {
    async buscarTudo(params = {}): Promise<void> {
      this.chamadasPendentes.lista = true;
      try {
        const { linhas } = await this.requestS.get(`${baseUrl}/dashboard`, params);
        this.lista = linhas;
      } catch (erro: unknown) {
        this.erro = erro;
      }
      this.chamadasPendentes.lista = false;
    },
  },

  getters: {
    dashboardEmFoco(): DashboardItemDto | null {
      const { lista, route: { query: { id } } } = this;

      return (!id
        ? undefined
        : lista.find(x => x.id === Number(id))
      ) || null;
    },
  },
});
