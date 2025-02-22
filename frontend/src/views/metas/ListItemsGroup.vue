<script setup>
import { Dashboard } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useMacrotemasStore } from '@/stores/macrotemas.store';
import { useMetasStore } from '@/stores/metas.store';
import { useSubtemasStore } from '@/stores/subtemas.store';
import { useTemasStore } from '@/stores/temas.store';
import { storeToRefs } from 'pinia';
import { reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

const baseUrl = `${import.meta.env.VITE_API_URL}`;

const authStore = useAuthStore();
const { permissions } = storeToRefs(authStore);
const perm = permissions.value;

const props = defineProps(['group', 'type', 'parentPage']);

const MetasStore = useMetasStore();
const { activePdm, tempMetas } = storeToRefs(MetasStore);
MetasStore.getPdM();

const route = useRoute();
const { id } = route.params;
let currentStore;
let currentStoreKey;
switch (props.group) {
  case 'macro_tema':
    currentStore = useMacrotemasStore();
    currentStoreKey = 'tempMacrotemas';
    break;
  case 'tema':
    currentStore = useTemasStore();
    currentStoreKey = 'tempTemas';
    break;
  case 'sub_tema':
    currentStore = useSubtemasStore();
    currentStoreKey = 'tempSubtemas';
    break;
}
currentStore.getById(id);

const filters = reactive({
  groupBy: props.group,
  filteredId: id,
});
const itemsFiltered = ref(tempMetas);

function filterItems() {
  MetasStore.filterMetas(filters);
  localStorage.setItem('groupBy', filters.groupBy);
}
filterItems();
function groupSlug(s) {
  let r;
  switch (s) {
    case 'macro_tema': r = 'macrotemas'; break;
    case 'tema': r = 'temas'; break;
    case 'sub_tema': r = 'subtemas'; break;
    default: r = s;
  }
  return r;
}
</script>
<template>
  <Dashboard>
    <div class="flex spacebetween center mb2">
      <img
        v-if="activePdm.logo"
        :src="`${baseUrl}/download/${activePdm.logo}?inline=true`"
        width="100"
        class="ib mr1"
      >
      <h1 v-else>
        {{ activePdm.nome }}
      </h1>
      <hr class="ml2 f1">
      <div class="ml2 dropbtn">
        <span class="btn">Adicionar</span>
        <ul>
          <li>
            <router-link
              v-if="perm?.CadastroMeta?.inserir"
              to="/metas/novo"
            >
              Nova Meta
            </router-link>
          </li>
          <li>
            <router-link
              v-if="perm?.CadastroMacroTema?.inserir && activePdm.possui_macro_tema"
              to="/metas/macrotemas/novo"
            >
              {{ activePdm.rotulo_macro_tema ?? 'Macrotema' }}
            </router-link>
          </li>
          <li>
            <router-link
              v-if="perm?.CadastroTema?.inserir && activePdm.possui_tema"
              to="/metas/temas/novo"
            >
              {{ activePdm.rotulo_tema ?? 'Tema' }}
            </router-link>
          </li>
          <li>
            <router-link
              v-if="perm?.CadastroSubTema?.inserir && activePdm.possui_sub_tema"
              to="/metas/subtemas/novo"
            >
              {{ activePdm.rotulo_sub_tema ?? 'Subtema' }}
            </router-link>
          </li>
          <li>
            <router-link
              v-if="perm?.CadastroTag?.inserir"
              to="/metas/tags/novo"
            >
              Tag
            </router-link>
          </li>
        </ul>
      </div>
    </div>
    <div class="mb2">
      <div class="label tc300">
        {{ activePdm['rotulo_' + filters.groupBy] }}
      </div>
      <div class="t48 w700">
        {{ currentStore[currentStoreKey]?.descricao }}
      </div>
    </div>

    <div class="boards">
      <template v-if="itemsFiltered.length">
        <div class="">
          <ul class="metas">
            <li
              v-for="m in itemsFiltered"
              :key="m.id"
              class="meta flex center mb1"
            >
              <router-link
                :to="`/metas/${m.id}`"
                class="flex center f1"
              >
                <div class="farol" />
                <div class="t13">
                  Meta {{ m.codigo }} - {{ m.titulo }}
                </div>
              </router-link>
              <router-link
                v-if="perm?.CadastroMeta?.editar"
                :to="`/metas/editar/${m.id}`"
                class="f0 tprimary ml1"
              >
                <svg
                  width="20"
                  height="20"
                ><use xlink:href="#i_edit" /></svg>
              </router-link>
            </li>
          </ul>
          <hr class="mt2 mb2">
          <div
            v-if="perm?.CadastroMeta?.inserir"
            class="tc bgc50 p1"
          >
            <router-link
              :to="`/metas/${groupSlug(filters.groupBy)}/${id}/novo`"
              class="btn big"
            >
              <span>Adicionar meta</span>
            </router-link>
          </div>
        </div>
      </template>
      <template v-else-if="itemsFiltered.loading">
        <div class="p1">
          <span>Carregando</span> <svg
            class="ml1 ib"
            width="20"
            height="20"
          ><use xlink:href="#i_spin" /></svg>
        </div>
      </template>
      <template v-else-if="itemsFiltered.error">
        <div class="error p1">
          <p class="error-msg">
            Error: {{ itemsFiltered.error }}
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
