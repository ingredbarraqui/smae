<script setup>
import BotãoParaCarregarMais from '@/components/relatorios/BotaoParaCarregarMais.vue';
import TabelaBásica from '@/components/relatorios/TabelaBasica.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useRelatoriosStore } from '@/stores/relatorios.store.ts';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { relatórioDePrevisãoDeCustoPortfolio as schema } from '@/consts/formSchemas';
import { prepararEtiquetas, prepararPortfolios } from './helpers/preparadorDeColunaParametros';

const relatóriosStore = useRelatoriosStore();
const { temPermissãoPara } = storeToRefs(useAuthStore());

const fonte = 'ProjetoPrevisaoCusto';

const etiquetasParaValoresDeParâmetros = ref({
  portfolio_id: {},
});

const etiquetasParaParâmetros = prepararEtiquetas(schema);

async function iniciar() {
  relatóriosStore.$reset();
  relatóriosStore.getAll({ fonte });

  etiquetasParaValoresDeParâmetros.value.portfolio_id = await prepararPortfolios();
}

iniciar();
</script>
<template>
  <div class="flex spacebetween center mb2">
    <h1>{{ $route.meta.título }}</h1>
    <hr class="ml2 f1">
    <router-link
      v-if="temPermissãoPara('Reports.executar')"
      :to="{ name: 'novoRelatórioDePrevisãoDeCustoPortfolio' }"
      class="btn big ml2"
    >
      Novo relatório
    </router-link>
  </div>

  <TabelaBásica
    class="mb1"
    :etiquetas-para-valores-de-parâmetros="etiquetasParaValoresDeParâmetros"
    :etiquetas-para-parâmetros="etiquetasParaParâmetros"
  />

  <BotãoParaCarregarMais :fonte="fonte" />
</template>
