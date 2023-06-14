import { requestS } from '@/helpers';
import { usePdMStore } from '@/stores';
import { defineStore } from 'pinia';

const baseUrl = `${import.meta.env.VITE_API_URL}`;

export const useSubtemasStore = defineStore({
  id: 'Subtemas',
  state: () => ({
    Subtemas: {},
    tempSubtemas: {},
  }),
  actions: {
    clear() {
      this.Subtemas = {};
      this.tempSubtemas = {};
    },
    async getAll() {
      try {
        if (this.Subtemas.loading) return;
        this.Subtemas = { loading: true };
        const r = await requestS.get(`${baseUrl}/subtema`);
        if (r.linhas.length) {
          const PdMStore = usePdMStore();
          if (!PdMStore.PdM.length) await PdMStore.getAll();
          this.Subtemas = r.linhas.map((x) => {
            x.pdm = PdMStore.PdM.find((z) => z.id == x.pdm_id);
            return x;
          });
        } else {
          this.Subtemas = r.linhas;
        }
      } catch (error) {
        this.Subtemas = { error };
      }
    },
    async getAllSimple() {
      this.Subtemas = { loading: true };
      try {
        const r = await requestS.get(`${baseUrl}/subtema`);
        this.Subtemas = r.linhas;
      } catch (error) {
        this.Subtemas = { error };
      }
    },
    async getById(id) {
      this.tempSubtemas = { loading: true };
      try {
        if (!this.Subtemas.length) {
          await this.getAllSimple();
        }
        this.tempSubtemas = this.Subtemas.length ? this.Subtemas.find((u) => u.id == id) : {};
        if (!this.tempSubtemas) throw 'Subtemas não encontrada';
      } catch (error) {
        this.tempSubtemas = { error };
      }
    },
    async insert(params) {
      const m = {
        pdm_id: Number(params.pdm_id),
        descricao: params.descricao,
      };
      if (await requestS.post(`${baseUrl}/subtema`, m)) return true;
      return false;
    },
    async update(id, params) {
      const m = {
        pdm_id: Number(params.pdm_id),
        descricao: params.descricao,
      };
      if (await requestS.patch(`${baseUrl}/subtema/${id}`, m)) return true;
      return false;
    },
    async delete(id) {
      if (await requestS.delete(`${baseUrl}/subtema/${id}`)) return true;
      return false;
    },
    async filterSubtemas(f) {
      this.tempSubtemas = { loading: true };
      try {
        if (!this.Subtemas.length) {
          await this.getAll();
        }
        this.tempSubtemas = f ? this.Subtemas.filter((u) => (f.textualSearch ? (u.descricao + u.titulo + u.numero).toLowerCase().includes(f.textualSearch.toLowerCase()) : 1)) : this.Subtemas;
      } catch (error) {
        this.tempSubtemas = { error };
      }
    },
    async filterByPdm(pdm_id) {
      this.tempSubtemas = { loading: true };
      try {
        if (!this.Subtemas.length) {
          await this.getAllSimple();
        }
        this.tempSubtemas = this.Subtemas.filter((u) => u.pdm_id == pdm_id);
      } catch (error) {
        this.tempSubtemas = { error };
      }
    },
  },
});
