<script setup>
import { Dashboard } from '@/components';
import { default as SimpleIndicador } from '@/components/metas/SimpleIndicador.vue';
import { IniciativaAtiva } from '@/helpers/IniciativaAtiva';
import {
  useAtividadesStore, useAuthStore, useIniciativasStore, useMetasStore,
} from '@/stores';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { classeParaFarolDeAtraso, textoParaFarolDeAtraso } from './helpers/auxiliaresParaFaroisDeAtraso.ts';

IniciativaAtiva();

const authStore = useAuthStore();
const { permissions } = storeToRefs(authStore);
const perm = permissions.value;

const route = useRoute();
const { meta_id } = route.params;
const { iniciativa_id } = route.params;

const parentlink = `${meta_id ? `/metas/${meta_id}` : ''}${iniciativa_id ? `/iniciativas/${iniciativa_id}` : ''}`;

const MetasStore = useMetasStore();
const { activePdm } = storeToRefs(MetasStore);
MetasStore.getPdM();

const IniciativasStore = useIniciativasStore();
const { singleIniciativa, órgãosResponsáveisNaIniciativaEmFoco } = storeToRefs(IniciativasStore);
if (singleIniciativa.value.id != iniciativa_id) IniciativasStore.getById(meta_id, iniciativa_id);

const AtividadesStore = useAtividadesStore();
const { Atividades } = storeToRefs(AtividadesStore);
if (!Atividades.value[iniciativa_id]) AtividadesStore.getAll(iniciativa_id);

</script>
<template>
  <Dashboard>
    <div class="flex spacebetween center mb2">
      <div>
        <div class="t12 uc w700 tamarelo">
          {{ activePdm.rotulo_iniciativa }}
        </div>
        <h1
          :class="classeParaFarolDeAtraso(singleIniciativa?.cronograma?.atraso_grau)"
          :title="textoParaFarolDeAtraso(singleIniciativa?.cronograma?.atraso_grau)"
          style="padding-right: 4px;"
        >
          {{ singleIniciativa.codigo }} - {{ singleIniciativa.titulo }}
        </h1>
      </div>
      <hr class="ml2 f1">
      <router-link
        v-if="perm?.CadastroIniciativa?.editar"
        :to="`/metas/${meta_id}/iniciativas/editar/${iniciativa_id}`"
        class="btn big ml2"
      >
        Editar
      </router-link>
    </div>

    <div class="boards">
      <template v-if="singleIniciativa.id">
        <div class="flex g2">
          <div class="mr2">
            <div class="t12 uc w700 mb05 tamarelo">
              Código
            </div>
            <div class="t13">
              {{ singleIniciativa.codigo }}
            </div>
          </div>

          <div class="mr2">
            <div class="t12 uc w700 mb05 tamarelo">
              Órgão responsável
            </div>
            <div class="t13">
              {{ órgãosResponsáveisNaIniciativaEmFoco.map(x => x.orgao.descricao).join(', ') }}
            </div>
          </div>

          <div class="mr2">
            <div class="t12 uc w700 mb05 tamarelo">
              Órgão participante
            </div>
            <div class="t13">
              {{ singleIniciativa.orgaos_participantes.map(x=>x.orgao.descricao).join(', ') }}
            </div>
          </div>
          <div class="mr2">
            <div class="t12 uc w700 mb05 tamarelo">
              Responsável na coordenadoria de planejamento
            </div>
            <div class="t13">
              {{ singleIniciativa.coordenadores_cp.map(x=>x.nome_exibicao).join(', ') }}
            </div>
          </div>
        </div>

        <template v-if="singleIniciativa.contexto">
          <hr class="mt2 mb2">
          <div>
            <h4>Contexto</h4>
            <div>{{ singleIniciativa.contexto }}</div>
          </div>
        </template>

        <template v-if="singleIniciativa.complemento">
          <hr class="mt2 mb2">
          <div>
            <h4>
              {{ activePdm.rotulo_complementacao_meta || 'Informações Complementares' }}
            </h4>
            <div>{{ singleIniciativa.complemento }}</div>
          </div>
        </template>

        <hr class="mt2 mb2">

        <SimpleIndicador
          :parentlink="parentlink"
          :parent_id="iniciativa_id"
          parent_field="iniciativa_id"
        />

        <template v-if="activePdm.possui_atividade">
          <div class="flex spacebetween center mt4 mb2">
            <h2 class="mb0">
              {{ activePdm.rotulo_atividade }}
            </h2>
            <hr class="ml2 f1">
            <router-link
              v-if="perm?.CadastroAtividade?.inserir"
              :to="`${parentlink}/atividades/novo`"
              class="btn ml2"
            >
              Adicionar {{ activePdm.rotulo_atividade }}
            </router-link>
          </div>

          <template v-if="Atividades[iniciativa_id].length">
            <div
              v-for="ini in Atividades[iniciativa_id]"
              :key="ini.id"
              class="board_variavel mb2"
            >
              <header class="p1">
                <div class="flex center g2 mb1">
                  <router-link
                    :to="`${parentlink}/atividades/${ini.id}`"
                    class="f0"
                    style="flex-basis: 2rem;"
                  >
                    <svg
                      width="28"
                      height="33"
                      viewBox="0 0 32 38"
                      color="#8EC122"
                      xmlns="http://www.w3.org/2000/svg"
                    ><use xlink:href="#i_atividade" /></svg>
                  </router-link>
                  <router-link
                    :to="`${parentlink}/atividades/${ini.id}`"
                    class="f1 mt1"
                  >
                    <h2 class="mb1">
                      {{ ini.titulo }}
                    </h2>
                  </router-link>
                  <div class="f0">
                    <router-link
                      :to="`${parentlink}/atividades/editar/${ini.id}`"
                      class="tprimary"
                    >
                      <svg
                        width="20"
                        height="20"
                      ><use xlink:href="#i_edit" /></svg>
                    </router-link>
                  </div>
                </div>
                <div class="f1 ml2">
                  <div class="flex g2 ml2">
                    <div class="mr1 f0">
                      <div class="t12 uc w700 mb05 tc300">
                        ID
                      </div>
                      <div class="t13">
                        {{ ini.codigo }}
                      </div>
                    </div>
                    <div class="mr1 f1">
                      <div class="t12 uc w700 mb05 tc300">
                        Órgão participante
                      </div>
                      <div class="t13">
                        {{ ini?.orgaos_participantes?.map(x=>x.orgao.descricao).join(', ') }}
                      </div>
                    </div>
                    <div class="f1">
                      <div class="t12 uc w700 mb05 tc300">
                        Responsável na coordenadoria de planejamento
                      </div>
                      <div class="t13">
                        {{ ini?.coordenadores_cp?.map(x=>x.nome_exibicao).join(', ') }}
                      </div>
                    </div>
                  </div>
                </div>
              </header>
            </div>
          </template>

          <div
            v-if="Atividades[iniciativa_id].loading"
            class="board_vazio"
          >
            <div class="tc">
              <div class="p1">
                <span>Carregando</span> <svg
                  class="ml1 ib"
                  width="20"
                  height="20"
                ><use xlink:href="#i_spin" /></svg>
              </div>
            </div>
          </div>
        </template>
      </template>
      <template v-else-if="singleIniciativa.loading">
        <div class="p1">
          <span>Carregando</span> <svg
            class="ml1 ib"
            width="20"
            height="20"
          ><use xlink:href="#i_spin" /></svg>
        </div>
      </template>
      <template v-else-if="singleIniciativa.error">
        <div class="error p1">
          <p class="error-msg">
            Error: {{ singleIniciativa.error }}
          </p>
        </div>
      </template>
      <template v-else>
        <div class="error p1">
          <p class="error-msg">
            Nenhum item encontrado.
          </p>
        </div>
      </template>
    </div>
  </Dashboard>
</template>
