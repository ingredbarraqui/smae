<script setup>
import { Dashboard } from '@/components';
import { useAuthStore } from '@/stores/auth.store';
import { useCiclosStore } from '@/stores/ciclos.store';
import { usePdMStore } from '@/stores/pdm.store';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import dateToField from '@/helpers/dateToField';
import dateToTitle from '@/helpers/dateToTitle';

const authStore = useAuthStore();
const { permissions } = storeToRefs(authStore);
const perm = permissions.value;

const PdMStore = usePdMStore();
const { activePdm } = storeToRefs(PdMStore);
if (!activePdm.value.id) PdMStore.getActive();

const CiclosStore = useCiclosStore();
const { MetasCiclos } = storeToRefs(CiclosStore);

const grupos = ref({});
const chaves = [];
(async () => {
  grupos.value = { loading: true };
  await CiclosStore.getMetas();
  grupos.value = MetasCiclos.value.length
    ? MetasCiclos.value.reduce((r, a) => {
      if (chaves.indexOf(a.fase) === -1) {
        chaves.push(a.fase);
      }
      r[a.fase] = r[a.fase] || [];

      if (a.coleta?.participante) {
        r[a.fase].push(a);
      }
      return r;
    }, Object.create(null))
    : MetasCiclos.value;
})();
</script>
<template>
  <Dashboard>
    <div class="label tamarelo">
      Metas por fase do ciclo
    </div>
    <div class="mb2">
      <div class="flex spacebetween center">
        <h1>
          {{ activePdm?.ciclo_fisico_ativo?.data_ciclo ?
            dateToTitle(activePdm.ciclo_fisico_ativo.data_ciclo)
            : 'Ciclo ativo'
          }}
        </h1>
        <hr class="ml2 f1">
      </div>
      <template v-if="activePdm?.ciclo_fisico_ativo">
        <p
          v-for="c in activePdm.ciclo_fisico_ativo.fases.filter(x=>x.fase_corrente)"
          :key="c.id"
          class="t24"
        >
          Etapa atual: {{ c.ciclo_fase }}
          - de <strong>{{ dateToField(c.data_inicio) }}</strong>
          até <strong>{{ dateToField(c.data_fim) }}</strong>
        </p>
      </template>
    </div>

    <div class="boards">
      <template v-if="!grupos.loading && !grupos.error">
        <div
          v-for="k in chaves"
          :key="k"
          class="board mb2"
          style="max-width: 100%;"
        >
          <h2>{{ k }}</h2>

          <div class="t11 tc300 mb2">
            {{ grupos[k]?.length }} meta(s)
          </div>
          <ul class="metas">
            <li
              v-for="m in grupos[k]"
              :key="m.id"
              class="meta flex center mb1"
            >
              <router-link
                :to="`/monitoramento/metas/${m.id}`"
                class="flex center f1"
              >
                <div class="farol" />
                <div class="t13">
                  Meta {{ m.codigo }} - {{ m.titulo }}
                </div>
              </router-link>
            </li>
          </ul>
        </div>
      </template>
      <template v-else-if="grupos.loading">
        <div class="p1">
          <span>Carregando</span> <svg
            class="ml1 ib"
            width="20"
            height="20"
          ><use xlink:href="#i_spin" /></svg>
        </div>
      </template>
      <template v-else-if="grupos.error">
        <div class="error p1">
          <p class="error-msg">
            Error: {{ grupos.error }}
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
