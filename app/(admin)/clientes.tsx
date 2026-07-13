import { useMemo } from 'react';
import { ApiRecordScreen, type ApiField } from '@/components/crud/ApiRecordScreen';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from '@/services/customers.service';
import { clienteSchema } from '@/validation/schemas';

const fields: ApiField[] = [
  { key: 'nome', label: 'Nome completo', placeholder: 'Nome do cliente' },
  { key: 'cpf', label: 'CPF', placeholder: '000.000.000-00', keyboardType: 'numeric' },
  { key: 'telefone', label: 'Telefone', placeholder: '(51) 99999-9999', keyboardType: 'phone-pad' },
  { key: 'email', label: 'E-mail', placeholder: 'cliente@email.com', keyboardType: 'email-address' },
  { key: 'cep', label: 'CEP', placeholder: '00000-000', keyboardType: 'numeric' },
  { key: 'rua', label: 'Rua', placeholder: 'Rua/Avenida' },
  { key: 'numero', label: 'Numero', placeholder: '123' },
  { key: 'bairro', label: 'Bairro', placeholder: 'Centro' },
  { key: 'cidade', label: 'Cidade', placeholder: 'Porto Alegre' },
  { key: 'estado', label: 'Estado', placeholder: 'RS' },
  { key: 'complemento', label: 'Complemento', placeholder: 'Apto, bloco, referencia' },
  { key: 'status', label: 'Status', options: ['ATIVO', 'INATIVO'] }
];

export default function Clientes() {
  const api = useMemo(() => ({
    list: listCustomers,
    create: createCustomer,
    update: updateCustomer,
    remove: deleteCustomer
  }), []);

  return <ApiRecordScreen
    title="Clientes"
    singular="cliente"
    fields={fields}
    schema={clienteSchema}
    api={api}
    fallbackData={[]}
    secondaryKeys={['cpf', 'telefone', 'cidade']}
  />;
}
