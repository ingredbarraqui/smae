<script setup>
import { ref, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { Dashboard} from '@/components';
import { useAuthStore, useOrgansStore } from '@/stores';

const authStore = useAuthStore();
const { permissions } = storeToRefs(authStore);
const perm = permissions.value;

const organsStore = useOrgansStore();
const { tempOrganTypes } = storeToRefs(organsStore);
organsStore.clear();
organsStore.filterOrganTypes();

const filters = reactive({
    textualSearch: ""
});
let itemsFiltered = ref(tempOrganTypes);

function filterItems(){
    organsStore.filterOrganTypes(filters);
}
</script>
<template>
    <Dashboard>
        <div class="flex spacebetween center mb2">
            <h1>Tipos de Orgão</h1>
            <hr class="ml2 f1"/>
            <router-link to="/orgaos" class="btn big amarelo ml2" v-if="perm?.CadastroOrgao">Gerenciar Orgãos</router-link>
            <router-link to="/orgaos/tipos/novo" class="btn big ml1" v-if="perm?.CadastroTipoOrgao?.inserir">Novo tipo</router-link>
        </div>
        <div class="flex center mb2">
            <div class="f2 search">
                <input v-model="filters.textualSearch" @input="filterItems" placeholder="Buscar" type="text" class="inputtext" />
            </div>
        </div>
        
        <table class="tablemain">
            <thead>
                <tr>
                    <th style="width: 90%">Tipo</th>
                    <th style="width: 10%"></th>
                </tr>
            </thead>
            <tbody>
                <template v-if="itemsFiltered.length">
                    <tr v-for="item in itemsFiltered" :key="item.id">
                        <td>{{ item.descricao }}</td>
                        <td style="white-space: nowrap; text-align: right;">
                            <template v-if="perm?.CadastroTipoOrgao?.editar">
                                <router-link :to="`/orgaos/tipos/editar/${item.id}`" class="tprimary"><svg width="20" height="20"><use xlink:href="#i_edit"></use></svg></router-link>
                            </template>
                        </td>
                    </tr>
                </template>
                <tr v-else-if="itemsFiltered.loading">
                    <td colspan="54">
                        Carregando
                    </td>
                </tr>
                <tr v-else-if="itemsFiltered.error">
                    <td colspan="54">
                        Error: {{itemsFiltered.error}}
                    </td>
                </tr>
                <tr v-else>
                    <td colspan="54">
                        Nenhum resultado encontrado.
                    </td>
                </tr>
            </tbody>
        </table>
    </Dashboard>
</template>