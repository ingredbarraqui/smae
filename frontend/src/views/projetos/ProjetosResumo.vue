<script setup>
import MenuDeMudançaDeStatusDeProjeto from '@/components/projetos/MenuDeMudançaDeStatusDeProjeto.vue';
import MapaExibir from '@/components/geo/MapaExibir.vue';
import { projeto as schema } from '@/consts/formSchemas';
import statuses from '@/consts/projectStatuses';
import dateToField from '@/helpers/dateToField';
import dinheiro from '@/helpers/dinheiro';
import subtractDates from '@/helpers/subtractDates';
import truncate from '@/helpers/truncate';
import { useDotaçãoStore } from '@/stores/dotacao.store.ts';
import { useOrgansStore } from '@/stores/organs.store';
import { useProjetosStore } from '@/stores/projetos.store.ts';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

const DotaçãoStore = useDotaçãoStore();
const ÓrgãosStore = useOrgansStore();
const projetosStore = useProjetosStore();

const { FontesDeRecursosPorAnoPorCódigo } = storeToRefs(DotaçãoStore);
const { organs, órgãosPorId } = storeToRefs(ÓrgãosStore);
const {
  chamadasPendentes, emFoco, erro,
} = storeToRefs(projetosStore);

const equipeAgrupadaPorÓrgão = computed(() => (Array.isArray(emFoco.value?.equipe)
  ? emFoco.value.equipe.reduce((acc, cur) => {
    if (!acc[`_${cur.orgao_id}`]) {
      acc[`_${cur.orgao_id}`] = { id: cur.orgao_id, pessoas: [] };
    }
    acc[`_${cur.orgao_id}`].pessoas.push(cur.pessoa);

    return acc;
  }, {})
  : {}));

defineProps({
  projetoId: {
    type: Number,
    default: 0,
  },
});

if (!Array.isArray(organs.value) || !organs.value.length) {
  ÓrgãosStore.getAll();
}
</script>
<template>
  <div class="flex spacebetween center mb2">
    <h1>{{ emFoco?.nome }}</h1>
    <hr class="ml2 f1">
    <MenuDeMudançaDeStatusDeProjeto />

    <router-link
      v-if="emFoco?.id && !emFoco?.arquivado && !emFoco?.permissoes?.apenas_leitura"
      :to="{ name: 'projetosEditar', params: { projetoId: emFoco.id } }"
      class="btn big ml2"
    >
      Editar
    </router-link>
  </div>

  <div
    v-if="emFoco"
    class="boards"
  >
    <div class="flex g2 mb1 flexwrap">
      <dl
        v-if="emFoco?.codigo"
        class="f1 mb1"
      >
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.codigo.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.codigo }}
        </dd>
      </dl>
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.status.spec.label }}
        </dt>
        <dd class="t13">
          {{ statuses[emFoco?.status] || emFoco?.status }}
        </dd>
      </dl>
    </div>

    <hr class="mb1 f1">

    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.resumo.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.resumo || '-' }}
        </dd>
      </dl>
    </div>

    <hr class="mb1 f1">

    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.objeto.spec.label }}
        </dt>
        <dd
          class="t13"
          v-html="emFoco?.objeto || '-'"
        />
      </dl>
    </div>
    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.objetivo.spec.label }}
        </dt>
        <dd
          class="t13"
          v-html="emFoco?.objetivo || '-'"
        />
      </dl>
    </div>
    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.publico_alvo.spec.label }}
        </dt>
        <dd
          class="t13"
          v-html="emFoco?.publico_alvo || '-'"
        />
      </dl>
    </div>

    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.premissas.spec.label }}
        </dt>
        <dd class="t13">
          <ul>
            <li v-if="!emFoco?.premissas?.length">
              {{ '-' }}
            </li>
            <li
              v-for="item in emFoco?.premissas"
              :key="item.id"
            >
              {{ item.premissa }}
            </li>
          </ul>
        </dd>
      </dl>
    </div>

    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.restricoes.spec.label }}
        </dt>
        <dd class="t13">
          <ul>
            <li v-if="!emFoco?.restricoes?.length">
              -
            </li>
            <li
              v-for="item in emFoco?.restricoes"
              v-else
              :key="item.id"
            >
              {{ item.restricao }}
            </li>
          </ul>
        </dd>
      </dl>
    </div>

    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.principais_etapas.spec.label }}
        </dt>
        <dd
          class="t13"
          v-html="emFoco?.principais_etapas || '-'"
        />
      </dl>
    </div>

    <div class="flex g2">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.nao_escopo.spec.label }}
        </dt>
        <dd
          class="t13"
          v-html="emFoco?.nao_escopo || '-'"
        />
      </dl>
    </div>

    <hr class="mb1 f1">

    <div
      v-if="emFoco?.geolocalizacao?.length"
      class="mb1"
    >
      <h3 class="label mt2 mb1legend">
        Localização
      </h3>

      <div
        v-for="(item, i) in emFoco.geolocalizacao"
        :key="i"
        class="mb1"
      >
        <dl class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ item.endereco_exibicao }}
          </dt>
          <dd>
            <MapaExibir
              :marcador="[
                item.endereco.geometry.coordinates[1],
                item.endereco.geometry.coordinates[0]
              ]"
              :latitude="item.endereco.geometry.coordinates[1]"
              :longitude="item.endereco.geometry.coordinates[0]"
              :camadas="item.camadas"
              class="mb1"
              :opções-do-polígono="{
                fill: true,
                opacity: 0.5,
              }"
              zoom="16"
            />
          </dd>
        </dl>
      </div>
    </div>

    <hr class="mb1 f1">

    <h2>
      {{ schema.fields.fonte_recursos.spec.label }}
    </h2>

    <div class="flex g2 mb2">
      <table class="tablemain">
        <col class="col--minimum">
        <col>
        <col>
        <col>
        <col>
        <thead>
          <tr>
            <th
              class="cell--minimum"
              colspan="2"
            >
              {{ schema.fields.fonte_recursos.innerType.fields.fonte_recurso_cod_sof.spec.label }}
            </th>
            <th class="cell--number cell--minimum">
              {{ schema.fields.fonte_recursos.innerType.fields.fonte_recurso_ano.spec.label }}
            </th>
            <th class="cell--number cell--minimum">
              {{ schema.fields.fonte_recursos.innerType.fields.valor_nominal.spec.label }}
            </th>
            <th class="cell--number cell--minimum">
              {{ schema.fields.fonte_recursos.innerType.fields.valor_percentual.spec.label }}
            </th>
          </tr>
        </thead>

        <tr
          v-for="item in emFoco?.fonte_recursos"
          :key="item.id"
        >
          <td>
            {{ item.fonte_recurso_cod_sof }}
          </td>
          <td
            :title="FontesDeRecursosPorAnoPorCódigo?.[item.fonte_recurso_ano]?.[item.fonte_recurso_cod_sof]?.descricao"
          >
            <template
              v-if="FontesDeRecursosPorAnoPorCódigo?.[item.fonte_recurso_ano]?.[item.fonte_recurso_cod_sof]?.descricao"
            >
              {{
                truncate(
                  FontesDeRecursosPorAnoPorCódigo[item.fonte_recurso_ano][item.fonte_recurso_cod_sof].descricao,
                  36
                )
              }}
            </template>
          </td>
          <td class="cell--number">
            {{ item.fonte_recurso_ano }}
          </td>
          <td class="cell--number">
            {{ item.valor_nominal ? `R$ ${dinheiro(item.valor_nominal)}` : '-' }}
          </td>
          <td class="cell--number">
            {{ item.valor_percentual ? `${dinheiro(item.valor_percentual)}%` : '-' }}
          </td>
        </tr>
        <tr v-if="!emFoco?.fonte_recursos?.length">
          <td
            colspan="5"
            class="center"
          >
            -
          </td>
        </tr>
      </table>
    </div>

    <div>
      <h2>{{ schema.fields.origem_tipo.spec.label }}</h2>

      <dl
        v-if="emFoco?.origem_tipo !== 'PdmSistema'"
        class="mb1"
      >
        <dt
          v-if="emFoco?.meta_codigo"
          class="t12 uc w700 mb05 tamarelo"
        >
          Meta {{ emFoco.meta_codigo }} do PdM Antigo
        </dt>

        <dt
          v-else
          class="t12 uc w700 mb05 tamarelo"
        >
          Fora do PdM
        </dt>

        <dd class="t13">
          {{ emFoco?.origem_outro || '-' }}
        </dd>
      </dl>

      <div
        v-else
        class="flex g2"
      >
        <dl
          v-if="emFoco?.meta_id"
          class="f1 mb1"
        >
          <dt class="t12 uc w700 mb05 tamarelo">
            Meta Vinculada
          </dt>
          <dd
            v-if="emFoco?.meta?.codigo && emFoco?.meta?.titulo"
            class="t13"
          >
            {{ emFoco.meta?.codigo }} - {{ emFoco?.meta?.titulo }}
          </dd>
          <dd
            v-else
            class="t13"
          >
            {{ emFoco.meta_id }}
          </dd>
        </dl>

        <dl
          v-if="emFoco?.iniciativa_id"
          class="f1 mb1"
        >
          <dt class="t12 uc w700 mb05 tamarelo">
            Iniciativa vinculada
          </dt>
          <dd
            v-if="emFoco?.iniciativa?.codigo && emFoco?.iniciativa?.titulo"
            class="t13"
          >
            {{ emFoco.iniciativa?.codigo }} - {{ emFoco?.iniciativa?.titulo }}
          </dd>
          <dd
            v-else
            class="t13"
          >
            {{ emFoco.iniciativa_id }}
          </dd>
        </dl>
        <dl
          v-if="emFoco?.atividade_id"
          class="f1 mb1"
        >
          <dt class="t12 uc w700 mb05 tamarelo">
            Atividade vinculada
          </dt>
          <dd
            v-if="emFoco?.atividade?.codigo && emFoco?.atividade?.titulo"
            class="t13"
          >
            {{ emFoco.atividade?.codigo }} - {{ emFoco?.atividade?.titulo }}
          </dd>
          <dd
            v-else
            class="t13"
          >
            {{ emFoco.atividade_id }}
          </dd>
        </dl>
      </div>
    </div>

    <hr class="mt2 mb2 f1">

    <div class="flex g2 mb1 flexwrap">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.previsao_inicio.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.previsao_inicio ? dateToField(emFoco.previsao_inicio) : '-' }}
        </dd>
      </dl>
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.previsao_termino.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.previsao_termino ? dateToField(emFoco.previsao_termino) : '-' }}
        </dd>
      </dl>
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.tolerancia_atraso.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.tolerancia_atraso || '-' }}
        </dd>
      </dl>
      <dl class="f2 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.previsao_custo.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.previsao_custo ? `R$ ${dinheiro(emFoco.previsao_custo)}` : '-' }}
        </dd>
      </dl>
    </div>

    <hr class="mb1 f1">

    <div>
      <h2>
        Órgãos
      </h2>
      <dl class="flex g2 flexwrap">
        <div class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ schema.fields.orgao_gestor_id.spec.label }}
          </dt>
          <dd class="t13">
            {{ emFoco?.orgao_gestor.sigla }} - {{ emFoco?.orgao_gestor.descricao }}
          </dd>
        </div>
        <div class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ schema.fields.responsaveis_no_orgao_gestor.spec.label }}
          </dt>
          <dd class="t13">
            {{ emFoco?.responsaveis_no_orgao_gestor
              && Array.isArray(emFoco.responsaveis_no_orgao_gestor)
              ? emFoco?.responsaveis_no_orgao_gestor?.map((x) => x.nome_exibicao || x).join(', ')
              : '-' }}
          </dd>
        </div>

        <div class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ schema.fields.secretario_executivo.spec.label }}
          </dt>
          <dd class="t13">
            {{ emFoco?.secretario_executivo || '-' }}
          </dd>
        </div>
      </dl>
      <dl class="flex g2 flexwrap">
        <div class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ schema.fields.orgao_responsavel_id.spec.label }}
          </dt>
          <dd class="t13">
            {{ emFoco?.orgao_responsavel?.sigla }} - {{ emFoco?.orgao_responsavel?.descricao }}
          </dd>
        </div>
        <div class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ schema.fields.responsavel_id.spec.label }}
          </dt>
          <dd class="t13">
            {{ emFoco?.responsavel?.nome_exibicao || emFoco?.responsavel_id || '-' }}
          </dd>
        </div>

        <div class="f1 mb1">
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ schema.fields.secretario_responsavel.spec.label }}
          </dt>
          <dd class="t13">
            {{ emFoco?.secretario_responsavel || '-' }}
          </dd>
        </div>
      </dl>

      <dl
        v-if="emFoco?.orgaos_participantes?.length"
        class="f1 mb1 fb100"
      >
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.orgaos_participantes.spec.label }}
        </dt>
        <dd class="t13">
          <template
            v-for="item in emFoco?.orgaos_participantes"
            :key="item.id"
          >
            {{ item.sigla }} - {{ item.descricao }},
          </template>
        </dd>
      </dl>
    </div>

    <hr
      v-if="emFoco.equipe?.length"
      class="mb1 f1"
    >

    <div
      v-if="emFoco.equipe?.length"
      class="mb1"
    >
      <h2>
        {{ schema.fields.equipe.spec.label }}
      </h2>
      <div class="flex g2 mb1 flexwrap">
        <dl
          v-for="(órgão, key) in equipeAgrupadaPorÓrgão"
          :key="key"
          class="f1"
        >
          <dt class="t12 uc w700 mb05 tamarelo">
            {{ órgãosPorId[órgão.id]
              ? `${órgãosPorId[órgão.id].sigla} - ${órgãosPorId[órgão.id].descricao}`
              : órgão.id }}
          </dt>
          <dd class="t13">
            <ul class="listaComoTexto">
              <li v-if="!órgão.pessoas?.length">
                {{ '-' }}
              </li>
              <li
                v-for="item in órgão.pessoas"
                :key="item.id"
              >
                {{ item.nome_exibicao }}
              </li>
            </ul>
          </dd>
        </dl>
      </div>
    </div>

    <hr class="mb1 f1">

    <h2>Controle de versões</h2>

    <div class="flex g2 mb1 flexwrap">
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.versao.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.versao || '-' }}
        </dd>
      </dl>
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.data_aprovacao.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.data_aprovacao ? dateToField(emFoco.data_aprovacao) : '-' }}
        </dd>
      </dl>
      <dl class="f1 mb1">
        <dt class="t12 uc w700 mb05 tamarelo">
          {{ schema.fields.data_revisao.spec.label }}
        </dt>
        <dd class="t13">
          {{ emFoco?.data_revisao ? dateToField(emFoco.data_revisao) : '-' }}
        </dd>
      </dl>
    </div>
  </div>

  <template v-if="emFoco?.status === 'Fechado'">
    <hr class="mb1 f1">

    <h2>
      Encerramento do projeto
    </h2>

    <table class="tablemain">
      <colgroup>
        <col>
        <col>
        <col>
        <col>
      </colgroup>

      <thead>
        <tr class="pl3 center mb05 tc300 w700 t12 uc">
          <th />
          <th class="tr">
            Planejado
          </th>
          <th class="tr">
            Realizado
          </th>
          <th class="tr">
            Desvio
          </th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <th>
            Data de início
          </th>
          <td class="tr">
            {{ emFoco?.previsao_inicio ? dateToField(emFoco.previsao_inicio) : '-' }}
          </td>
          <td class="tr">
            {{ emFoco?.realizado_inicio ? dateToField(emFoco.realizado_inicio) : '-' }}
          </td>
          <td class="cell--number">
            {{ emFoco?.realizado_inicio && emFoco?.previsao_inicio
              ? `${subtractDates(emFoco.realizado_inicio, emFoco.previsao_inicio)} dias`
              : '-' }}
          </td>
        </tr>

        <tr>
          <th>
            Data de término
          </th>
          <td class="tr">
            {{ emFoco?.previsao_termino ? dateToField(emFoco.previsao_termino) : '-' }}
          </td>
          <td class="tr">
            {{ emFoco?.realizado_termino ? dateToField(emFoco.realizado_termino) : '-' }}
          </td>
          <td class="cell--number">
            {{ emFoco?.realizado_termino && emFoco?.previsao_termino
              ? `${subtractDates(emFoco.realizado_termino, emFoco.previsao_termino)} dias`
              : '-' }}
          </td>
        </tr>

        <tr>
          <th>
            Duração
          </th>
          <td class="cell--number">
            {{ emFoco?.previsao_duracao ? `${emFoco.previsao_duracao} dias` : '-' }}
          </td>
          <td class="cell--number">
            {{ emFoco?.realizado_duracao ? `${emFoco.realizado_duracao} dias` : '-' }}
          </td>
          <td class="cell--number">
            {{ emFoco?.realizado_duracao && emFoco?.previsao_duracao
              ? `${emFoco.realizado_duracao - emFoco.previsao_duracao} dias`
              : '-' }}
          </td>
        </tr>

        <tr>
          <th>
            Custo
          </th>
          <td class="cell--number">
            {{ emFoco?.previsao_custo ? `R$ ${dinheiro(emFoco.previsao_custo)}` : '-' }}
          </td>
          <td class="cell--number">
            {{ emFoco?.realizado_custo ? `R$ ${dinheiro(emFoco.realizado_custo)}` : '-' }}
          </td>
          <td class="cell--number">
            {{ emFoco?.realizado_custo && emFoco?.previsao_custo
              ? `R$ ${dinheiro(emFoco.realizado_custo - emFoco.previsao_custo)}`
              : '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </template>

  <span
    v-if="chamadasPendentes?.emFoco"
    class="spinner"
  >Carregando</span>

  <div
    v-if="erro"
    class="error p1"
  >
    <div class="error-msg">
      {{ erro }}
    </div>
  </div>
</template>
