<script setup>
import { useAlertStore } from '@/stores/alert.store';
import { useVariaveisStore } from '@/stores/variaveis.store';
import { useRoute } from 'vue-router';
import níveisRegionalização from '@/consts/niveisRegionalizacao';

const alertStore = useAlertStore();
const VariaveisStore = useVariaveisStore();

const route = useRoute();
const { indicador_id: indicadorId } = route.params;

defineProps({
  parentlink: {
    type: String,
    required: true,
  },
  variáveisCompostas: {
    type: Array,
    default: () => [],
  },
  indicadorRegionalizavel: {
    type: Boolean,
    required: true,
  },
});

async function apagarVariável(id) {
  alertStore.confirmAction('Deseja mesmo remover esse item?', async () => {
    try {
      if (await VariaveisStore.deleteCompound(indicadorId, id)) {
        VariaveisStore.clear();
        VariaveisStore.getAllCompound(indicadorId);
        alertStore.success('Item removido!');
      }
    } catch (error) {
      alertStore.error(error);
    }
  }, 'Remover');
}

function permitirEdição(indicadorVariavel) {
  if (!indicadorVariavel) {
    return true;
  }
  if (Array.isArray(indicadorVariavel)
    && indicadorVariavel.findIndex((x) => x.indicador_origem) === -1) {
    return true;
  }
  return false;
}
</script>
<template>
  <nav>
    <ul class="flex justifyleft mb1">
      <li class="mr1">
        <router-link
          :to="{
            path: `${parentlink}/indicadores/${indicadorId}/variaveis-compostas/novo`,
            query: $route.query,
          }"
          class="addlink"
        >
          <span>Adicionar variável</span>
          <svg
            width="20"
            height="20"
          >
            <use xlink:href="#i_+" />
          </svg>
        </router-link>
      </li>
      <li class="mr1">
        <router-link
          v-if="indicadorRegionalizavel"
          :to="{
            path: `${parentlink}/indicadores/${indicadorId}/variaveis-compostas/gerar`,
            query: $route.query,
          }"
          class="addlink"
        >
          <span>Gerar variáveis</span>
          <svg
            width="20"
            height="20"
          >
            <use xlink:href="#i_+" />
          </svg>
        </router-link>
      </li>
    </ul>
  </nav>

  <table class="tablemain mb1">
    <thead>
      <tr>
        <th style="width:13.3%;">
          Título
        </th>
        <th style="width:13.3%;">
          Nível de regionalização
        </th>
        <th style="width:13.3%;">
          Mostra monitoramento
        </th>
        <th style="width:20%" />
      </tr>
    </thead>
    <tr
      v-for="v in variáveisCompostas"
      :key="v.id"
    >
      <td>{{ v.titulo }}</td>
      <td>
        {{ v.nivel_regionalizacao
          ? níveisRegionalização.find(e => e.id == v.nivel_regionalizacao).nome
          : '-' }}
      </td>
      <td>{{ v.mostrar_monitoramento ? 'Sim' : 'Não' }}</td>
      <td style="white-space: nowrap; text-align: right;">
        <button
          class="like-a__link tipinfo tprimary"
          :disabled="!permitirEdição(v.indicador_variavel)"
          @click="apagarVariável(v.id)"
        >
          <svg
            width="20"
            height="20"
          >
            <use xlink:href="#i_remove" />
          </svg>
          <div>Apagar</div>
        </button>
        <router-link
          :to="{
            path: `${parentlink}/indicadores/${indicadorId}/variaveis-compostas/${v.id}`,
            query: $route.query,
          }"
          class="tipinfo tprimary ml1"
        >
          <svg
            width="20"
            height="20"
          >
            <use xlink:href="#i_edit" />
          </svg>
          <div>Editar</div>
        </router-link>
        <router-link
          :to="{
            path: `${parentlink}/indicadores/${indicadorId}/variaveis-compostas/${v.id}/valores`,
            query: $route.query,
          }"
          class="tipinfo tprimary ml1"
        >
          <svg
            width="20"
            height="20"
          ><use xlink:href="#i_valores" /></svg><div>Valores Previstos e Acumulados</div>
        </router-link>
        <router-link
          :to="{
            path: `${parentlink}/indicadores/${indicadorId}/variaveis-compostas/${v.id}/retroativos`,
            query: $route.query,
          }"
          class="tipinfo tprimary ml1"
        >
          <svg
            width="20"
            height="20"
          ><use xlink:href="#i_check" /></svg><div>Valores Realizados Retroativos</div>
        </router-link>
      </td>
    </tr>
  </table>
</template>
