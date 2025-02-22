<script setup>
import { Dashboard } from '@/components';
import { default as SimpleIndicador } from '@/components/metas/SimpleIndicador.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useIniciativasStore } from '@/stores/iniciativas.store';
import { useMetasStore } from '@/stores/metas.store';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { classeParaFarolDeAtraso, textoParaFarolDeAtraso } from './helpers/auxiliaresParaFaroisDeAtraso.ts';

const { temPermissãoPara } = useAuthStore();
const authStore = useAuthStore();
const { permissions } = storeToRefs(authStore);
const perm = permissions.value;

const route = useRoute();
const { meta_id } = route.params;

const parentlink = `${meta_id ? `/metas/${meta_id}` : ''}`;

const MetasStore = useMetasStore();
const { activePdm, singleMeta } = storeToRefs(MetasStore);
if (meta_id && singleMeta.value.id != meta_id) MetasStore.getById(meta_id);
if (meta_id && !activePdm.value.id) MetasStore.getPdM();

const IniciativasStore = useIniciativasStore();
const { Iniciativas } = storeToRefs(IniciativasStore);
if (!Iniciativas.value[meta_id]) IniciativasStore.getAll(meta_id);
</script>
<template>
  <Dashboard>
    <div class="flex spacebetween center mb2">
      <div>
        <div class="t12 uc w700 tamarelo">
          Meta
        </div>
        <h1
          :class="classeParaFarolDeAtraso(singleMeta?.cronograma?.atraso_grau)"
          :title="textoParaFarolDeAtraso(singleMeta?.cronograma?.atraso_grau)"
          style="padding-right: 4px;"
        >
          {{ singleMeta.codigo }} - {{ singleMeta.titulo }}
        </h1>
      </div>
      <hr class="ml2 f1">
      <router-link
        v-if="perm?.CadastroMeta?.editar"
        :to="`/metas/editar/${singleMeta.id}`"
        class="btn big ml2"
      >
        Editar
      </router-link>
    </div>

    <div class="boards">
      <template v-if="singleMeta.id">
        <div class="flex g2">
          <div
            v-if="activePdm.possui_macro_tema"
            class="mr2 f1"
          >
            <div class="t12 uc w700 mb05 tamarelo">
              {{ activePdm.rotulo_macro_tema }}
            </div>
            <div class="t13">
              {{ singleMeta?.macro_tema?.descricao }}
            </div>
          </div>
          <div
            v-if="activePdm.possui_tema"
            class="mr2 f2"
          >
            <div class="t12 uc w700 mb05 tamarelo">
              {{ activePdm.rotulo_tema }}
            </div>
            <div class="t13">
              {{ singleMeta?.tema?.descricao }}
            </div>
          </div>
          <div
            v-if="activePdm.possui_sub_tema"
            class="mr2 f1"
          >
            <div class="t12 uc w700 mb05 tamarelo">
              {{ activePdm.rotulo_sub_tema }}
            </div>
            <div class="t13">
              {{ singleMeta?.sub_tema?.descricao }}
            </div>
          </div>
        </div>
        <hr class="mt2 mb2">
        <div class="flex g2">
          <div
            v-if="singleMeta.orgaos_participantes.filter(x=>x.responsavel)"
            class="mr2 f1"
          >
            <div class="t12 uc w700 mb05 tamarelo">
              Órgão responsável
            </div>
            <div class="t13">
              {{
                singleMeta.orgaos_participantes
                  .filter(x=>x.responsavel).map(x=>x.orgao.descricao).join(', ')
              }}
            </div>
          </div>
          <div
            v-if="singleMeta.orgaos_participantes.filter(x=>!x.responsavel).length"
            class="mr2 f1"
          >
            <div class="t12 uc w700 mb05 tamarelo">
              Órgão participante
            </div>
            <div class="t13">
              {{
                singleMeta.orgaos_participantes
                  .filter(x=>!x.responsavel).map(x=>x.orgao.descricao).join(', ')
              }}
            </div>
          </div>
          <div
            v-if="singleMeta.coordenadores_cp"
            class="mr2 f1"
          >
            <div class="t12 uc w700 mb05 tamarelo">
              Responsável na coordenadoria de planejamento
            </div>
            <div class="t13">
              {{ singleMeta.coordenadores_cp.map(x=>x.nome_exibicao).join(', ') }}
            </div>
          </div>
        </div>
        <hr class="mt2 mb2">

        <div
          v-if="activePdm.possui_contexto_meta"
          class="mr2 f2"
        >
          <h4>{{ activePdm.rotulo_contexto_meta }}</h4>
          <div>{{ singleMeta.contexto }}</div>
          <hr class="mt2 mb2">
        </div>
        <div
          v-if="activePdm.possui_complementacao_meta&&singleMeta.complemento"
          class=""
        >
          <h4>{{ activePdm.rotulo_complementacao_meta }}</h4>
          <div>{{ singleMeta.complemento }}</div>
          <hr class="mt2 mb2">
        </div>

        <SimpleIndicador
          :parentlink="parentlink"
          :parent_id="meta_id"
          parent_field="meta_id"
        />
        <template v-if="activePdm.possui_iniciativa">
          <div class="flex spacebetween center mt4 mb2">
            <h2 class="mb0">
              {{ activePdm.rotulo_iniciativa }}
            </h2>
            <hr class="ml2 f1">
            <router-link
              v-if="perm?.CadastroIniciativa?.inserir&&activePdm.possui_iniciativa"
              :to="`${parentlink}/iniciativas/novo`"
              class="btn ml2"
            >
              Adicionar {{ activePdm.rotulo_iniciativa }}
            </router-link>
          </div>

          <div
            v-for="ini in Iniciativas[meta_id]"
            :key="ini.id"
            class="board_variavel mb2"
          >
            <header class="p1">
              <div class="flex center g2 mb1">
                <router-link
                  :to="`${parentlink}/iniciativas/${ini.id}`"
                  class="f0"
                  style="flex-basis: 2rem;"
                >
                  <svg
                    width="28"
                    height="33"
                    viewBox="0 0 32 38"
                    color="#8EC122"
                    xmlns="http://www.w3.org/2000/svg"
                  ><use xlink:href="#i_iniciativa" /></svg>
                </router-link>
                <router-link
                  :to="`${parentlink}/iniciativas/${ini.id}`"
                  class="f1 mt1"
                >
                  <h2 class="mb1">
                    {{ ini.titulo }}
                  </h2>
                </router-link>
                <div
                  v-if="temPermissãoPara('CadastroIniciativa.editar')"
                  class="f0"
                >
                  <router-link
                    :to="`${parentlink}/iniciativas/editar/${ini.id}`"
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

          <div
            v-if="Iniciativas[meta_id].loading"
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
      <template v-else-if="singleMeta.loading">
        <div class="p1">
          <span>Carregando</span> <svg
            class="ml1 ib"
            width="20"
            height="20"
          ><use xlink:href="#i_spin" /></svg>
        </div>
      </template>
      <template v-else-if="singleMeta.error">
        <div class="error p1">
          <p class="error-msg">
            Error: {{ singleMeta.error }}
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
