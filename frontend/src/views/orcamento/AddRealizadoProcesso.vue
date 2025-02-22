<script setup>
import ItensRealizado from '@/components/orcamento/ItensRealizado.vue';
import patterns from '@/consts/patterns';
import formatProcesso from '@/helpers/formatProcesso';
import { useAlertStore } from '@/stores/alert.store';
import { useAtividadesStore } from '@/stores/atividades.store';
import { useIniciativasStore } from '@/stores/iniciativas.store';
import { useMetasStore } from '@/stores/metas.store';
import { useOrcamentosStore } from '@/stores/orcamentos.store';
import { useDotaçãoStore } from '@/stores/dotacao.store.ts';
import { useProjetosStore } from '@/stores/projetos.store.ts';
import { storeToRefs } from 'pinia';
import { Field, Form } from 'vee-validate';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as Yup from 'yup';

const alertStore = useAlertStore();
const route = useRoute();
const router = useRouter();
const DotaçãoStore = useDotaçãoStore();
const ProjetoStore = useProjetosStore();
const { meta_id } = route.params;
const { ano } = route.params;
const { id } = route.params;
const { seiOuSinproc: regprocesso } = patterns;

const MetasStore = useMetasStore();
const { singleMeta, activePdm } = storeToRefs(MetasStore);

if (!route.params.projetoId) {
  MetasStore.getPdM();
  MetasStore.getChildren(meta_id);
}

const IniciativasStore = useIniciativasStore();
const { singleIniciativa } = storeToRefs(IniciativasStore);
const AtividadesStore = useAtividadesStore();
const { singleAtividade } = storeToRefs(AtividadesStore);

const parentlink = `${meta_id ? `/metas/${meta_id}` : ''}`;
const parent_item = ref(meta_id ? singleMeta : false);

const OrcamentosStore = useOrcamentosStore();
const { OrcamentoRealizado } = storeToRefs(OrcamentosStore);

const currentEdit = ref({});
const dota = ref('');
const respostasof = ref({});

const schema = Yup.object().shape({
  processo: Yup.string().required('Preencha o processo.').matches(regprocesso, 'Formato inválido'),
  dotacao: Yup.string(),
});

async function onSubmit(values) {
  try {
    let msg;
    let r;

    values.ano_referencia = Number(ano);

    if (values.location) {
      values.atividade_id = null;
      values.iniciativa_id = null;
      values.meta_id = null;

      if (values.location[0] == 'a') {
        values.atividade_id = Number(values.location.slice(1));
      } else if (values.location[0] == 'i') {
        values.iniciativa_id = Number(values.location.slice(1));
      } else if (values.location[0] == 'm') {
        values.meta_id = Number(values.location.slice(1));
      }
    }

    r = await OrcamentosStore.insertOrcamentoRealizado(values);
    msg = 'Dados salvos com sucesso!';

    if (r == true) {
      alertStore.success(msg);
      if (route.meta?.rotaDeEscape) {
        router.push({
          name: route.meta.rotaDeEscape,
          query: route.query,
        });
      } else {
        await router.push({
          path: `${parentlink}/orcamento/realizado`,
          query: route.query,
        });
      }
    }
  } catch (error) {
    alertStore.error(error);
  }
}

async function checkDelete(id) {
  alertStore.confirmAction('Deseja mesmo remover esse item?', async () => {
    if (await OrcamentosStore.deleteOrcamentoRealizado(id, route.params.projetoId)) {
      if (parentlink) {
        router.push({
          path: `${parentlink}/orcamento`,
          query: route.query,
        });
      } else if (route.meta?.rotaDeEscape) {
        router.push({
          name: route.meta.rotaDeEscape,
          query: route.query,
        });
      }
    }
  }, 'Remover');
}
function maskFloat(el) {
  el.target.value = dinheiro(Number(el.target.value.replace(/[\D]/g, '')) / 100);
  el.target?._vei?.onChange(el);
}
function dinheiro(v) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(v));
}
function toFloat(v) {
  return isNaN(v) || String(v).indexOf(',') !== -1 ? Number(String(v).replace(/[^0-9\,]/g, '').replace(',', '.')) : Math.round(Number(v) * 100) / 100;
}
function maskProcesso(el) {
  el.target.value = formatProcesso(el.target.value);
}
async function validarDota() {
  try {
    respostasof.value = { loading: true };
    const val = await schema.validate({
      processo: dota.value,
      valor_empenho: 1,
      valor_liquidado: 1,
    });
    if (val) {
      const params = route.params.projetoId
        ? { portfolio_id: ProjetoStore.emFoco.portfolio_id }
        : { pdm_id: activePdm.value.id };

      const r = await DotaçãoStore
        .getDotaçãoRealizadoProcesso(dota.value, ano, params);
      respostasof.value = r;
    }
  } catch (error) {
    respostasof.value = error;
  }
}
</script>
<template>
  <div class="flex spacebetween center">
    <h1>Empenho/Liquidação</h1>
    <hr class="ml2 f1">

    <CheckClose />
  </div>
  <h3 class="mb2">
    <strong>{{ ano }}</strong> - {{ parent_item.codigo }} - {{ parent_item.titulo }}
  </h3>
  <template v-if="!(OrcamentoRealizado[ano]?.loading || OrcamentoRealizado[ano]?.error)">
    <Form
      v-slot="{ errors, isSubmitting, values }"
      :validation-schema="schema"
      :initial-values="currentEdit"
      @submit="onSubmit"
    >
      <div class="flex center g2 mb2">
        <div class="f1">
          <label class="label">Processo SEI ou SINPROC <span class="tvermelho">*</span></label>
          <Field
            v-model="dota"
            name="processo"
            type="text"
            class="inputtext light mb1"
            :class="{
              'error': errors.processo, 'loading':
                respostasof.loading
            }"
            placeholder="DDDD.DDDD/DDDDDDD-D (SEI) ou AAAA-D.DDD.DDD-D (SINPROC)"
            @keyup="maskProcesso"
          />
          <div class="error-msg">
            {{ errors.processo }}
          </div>
          <div
            v-if="respostasof.loading"
            class="t13 mb1 tc300"
          >
            Aguardando resposta do SOF
          </div>
        </div>
        <div class="f0">
          <a
            class="btn outline bgnone tcprimary"
            @click="validarDota()"
          >Validar via SOF</a>
        </div>
      </div>
      <div
        v-if="respostasof.length"
        class="mb2"
      >
        <label class="label mb2">Dotação vinculada* <span class="tvermelho">*</span></label>

        <div class="flex g2">
          <div
            class="f0"
            style="flex-basis:30px"
          />
          <div class="f1">
            <label class="label tc300">Dotação</label>
          </div>
          <div class="f1">
            <label class="label tc300">Nome do Projeto/Atividade</label>
          </div>
          <div
            class="f0"
            style="flex-basis:90px"
          >
            <label class="label tc300">Valor Empenho</label>
          </div>
          <div
            class="f0"
            style="flex-basis:90px"
          >
            <label class="label tc300">Valor Liquidação</label>
          </div>
        </div>
        <hr class="mb05">
        <label
          v-for="(d, i) in respostasof"
          :key="d.id"
          class="flex g2 center mb1"
        >
          <div
            class="f0"
            style="flex-basis:30px"
          ><Field
            name="dotacao"
            type="radio"
            :value="d.dotacao"
            class="inputcheckbox"
          /><span /></div>
          <div class="f1">{{ d.dotacao }}</div>
          <div class="f1">{{ d.projeto_atividade }}</div>
          <div
            class="f0"
            style="flex-basis:90px"
          >{{ dinheiro(d.empenho_liquido) }}</div>
          <div
            class="f0"
            style="flex-basis:90px"
          >{{ dinheiro(d.valor_liquidado) }}</div>
        </label>
      </div>

      <Field
        v-if="$route.params.projetoId"
        name="projeto_id"
        type="hidden"
        :value="$route.params.projetoId"
      />

      <template v-if="respostasof.length && values.dotacao">
        <div v-if="!$route.params.projetoId">
          <label class="label">Vincular dotação<span class="tvermelho">*</span></label>

          <div
            v-for="m in singleMeta.children"
            :key="m.id"
          >
            <div class="label tc300">
              Meta
            </div>
            <label class="block mb1">
              <Field
                name="location"
                type="radio"
                :value="'m' + m.id"
                class="inputcheckbox"
              />
              <span>{{ m.codigo }} - {{ m.titulo }}</span>
            </label>
            <template v-if="['Iniciativa', 'Atividade'].indexOf(activePdm.nivel_orcamento) != -1">
              <div
                v-if="m?.iniciativas?.length"
                class="label tc300"
              >
                {{ activePdm.rotulo_iniciativa }}{{ ['Atividade'].indexOf(activePdm.nivel_orcamento) != -1
                  ? ' e ' + activePdm.rotulo_atividade
                  : '' }}
              </div>
              <div
                v-for="i in m.iniciativas"
                :key="i.id"
                class=""
              >
                <label class="block mb1">
                  <Field
                    name="location"
                    type="radio"
                    :value="'i' + i.id"
                    class="inputcheckbox"
                  />
                  <span>{{ i.codigo }} - {{ i.titulo }}</span>
                </label>
                <template v-if="activePdm.nivel_orcamento == 'Atividade'">
                  <div
                    v-for="a in i.atividades"
                    :key="a.id"
                    class="pl2"
                  >
                    <label class="block mb1">
                      <Field
                        name="location"
                        type="radio"
                        :value="'a' + a.id"
                        class="inputcheckbox"
                      />
                      <span>{{ a.codigo }} - {{ a.titulo }}</span>
                    </label>
                  </div>
                </template>
              </div>
            </template>
          </div>
          <div class="error-msg">
            {{ errors.location }}
          </div>
        </div>

        <ItensRealizado
          :controlador="values.itens"
          :respostasof="respostasof.find(x => x.dotacao == values.dotacao)"
          name="itens"
        />

        <div class="flex spacebetween center mb2">
          <hr class="mr2 f1">
          <button
            class="btn big"
            :disabled="isSubmitting"
          >
            Salvar
          </button>
          <hr class="ml2 f1">
        </div>
      </template>
    </Form>
  </template>
  <template v-if="currentEdit && currentEdit?.id">
    <button
      class="btn amarelo big"
      @click="checkDelete(currentEdit.id)"
    >
      Remover item
    </button>
  </template>
  <template v-if="OrcamentoRealizado[ano]?.loading">
    <span class="spinner">Carregando</span>
  </template>
  <template v-if="OrcamentoRealizado[ano]?.error || error">
    <div class="error p1">
      <div class="error-msg">
        {{ OrcamentoRealizado[ano].error ?? error }}
      </div>
    </div>
  </template>
</template>
