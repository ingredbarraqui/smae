<script setup>
import {
  useAtividadesStore, useAuthStore, useIniciativasStore, useMetasStore
} from '@/stores';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

const route = useRoute();
const { meta_id } = route.params;
const { iniciativa_id } = route.params;
const { atividade_id } = route.params;

const MetasStore = useMetasStore();
const { singleMeta, activePdm } = storeToRefs(MetasStore);
if (meta_id && singleMeta.value.id != meta_id) MetasStore.getById(meta_id);
if (meta_id && !activePdm.value.id) MetasStore.getPdM();

const IniciativasStore = useIniciativasStore();
const { singleIniciativa } = storeToRefs(IniciativasStore);
if (iniciativa_id && singleIniciativa.value.id != iniciativa_id) {
  IniciativasStore.getById(meta_id, iniciativa_id);
}

const AtividadesStore = useAtividadesStore();
const { singleAtividade } = storeToRefs(AtividadesStore);
if (atividade_id && singleAtividade.value.id != atividade_id) {
  AtividadesStore.getById(iniciativa_id, atividade_id);
}

const { temPermissãoPara } = useAuthStore();

const groupBy = localStorage.getItem('groupBy') ?? 'macro_tema';
let groupByRoute;

switch (groupBy) {
  case 'macro_tema':
    groupByRoute = 'macrotemas';
    break;
  case 'tema':
    groupByRoute = 'temas';
    break;
  case 'sub_tema':
    groupByRoute = 'subtemas';
    break;
}
</script>
<template>
  <div id="submenu">
    <div class="breadcrumbmenu">
      <router-link
        v-if="activePdm.id"
        to="/metas"
      >
        <span>{{ activePdm.nome }}</span>
      </router-link>
      <router-link
        v-if="meta_id && activePdm.id && activePdm['possui_' + groupBy] && singleMeta[groupBy]"
        :to="`/metas/${groupByRoute}/${singleMeta[groupBy]?.id}`"
      >
        <span>{{ activePdm['rotulo_'+groupBy] }} {{ singleMeta[groupBy]?.descricao }}</span>
      </router-link>
      <router-link
        v-if="meta_id&&singleMeta.id"
        :to="`/metas/${meta_id}`"
      >
        <span>Meta {{ singleMeta?.codigo }} {{ singleMeta?.titulo }}</span>
      </router-link>
      <router-link
        v-if="iniciativa_id&&activePdm.possui_iniciativa&&singleIniciativa.id"
        :to="`/metas/${meta_id}/iniciativas/${iniciativa_id}`"
      >
        <span>
          {{ activePdm.rotulo_iniciativa }}
          {{ singleIniciativa?.codigo }}
          {{ singleIniciativa?.titulo }}
        </span>
      </router-link>
      <router-link
        v-if="atividade_id&&activePdm.possui_atividade&&singleAtividade.id"
        :to="`/metas/${meta_id}/iniciativas/${iniciativa_id}/atividades/${atividade_id}`"
      >
        <span>
          {{ activePdm.rotulo_atividade }}
          {{ singleAtividade?.codigo }}
          {{ singleAtividade?.titulo }}
        </span>
      </router-link>
    </div>
    <div class="subpadding">
      <template v-if="temPermissãoPara(['PDM.admin_cp', 'PDM.tecnico_cp', 'PDM.ponto_focal'])">
        <h2>
          Programa de Metas
        </h2>

        <div class="links-container mb2">
          <router-link :to="`/metas/${meta_id}${ iniciativa_id?'/iniciativas/'+iniciativa_id:'' }${ atividade_id ?'/atividades/'+atividade_id:'' }`">
            Resumo
          </router-link>
          <router-link
            v-if="!iniciativa_id"
            :to="`/metas/${meta_id}/painel`"
          >
            Painel da meta
          </router-link>
          <router-link :to="`/metas/${meta_id}${ iniciativa_id?'/iniciativas/'+iniciativa_id:'' }${ atividade_id?'/atividades/'+atividade_id:'' }/evolucao`">
            Evolução
          </router-link>
          <router-link :to="`/metas/${meta_id}${ iniciativa_id?'/iniciativas/'+iniciativa_id:'' }${ atividade_id?'/atividades/'+atividade_id:'' }/cronograma`">
            Cronograma
          </router-link>
        </div>
      </template>

      <template v-if="temPermissãoPara(['CadastroMeta.orcamento'])">
        <h2>
          Visão orçamentária
        </h2>
        <div class="links-container mb2">
          <router-link
            v-if="!iniciativa_id"
            :to="`/metas/${meta_id}${ iniciativa_id?'/iniciativas/'+iniciativa_id:'' }${ atividade_id?'/atividades/'+atividade_id:'' }/orcamento/custo`"
          >
            Previsão de custo
          </router-link>
          <router-link
            v-if="!iniciativa_id"
            :to="`/metas/${meta_id}${ iniciativa_id?'/iniciativas/'+iniciativa_id:'' }${ atividade_id?'/atividades/'+atividade_id:'' }/orcamento/planejado`"
          >
            Orçamento planejado
          </router-link>
          <router-link
            v-if="!iniciativa_id"
            :to="`/metas/${meta_id}${ iniciativa_id?'/iniciativas/'+iniciativa_id:'' }${ atividade_id?'/atividades/'+atividade_id:'' }/orcamento/realizado`"
          >
            Execução orçamentária
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>
