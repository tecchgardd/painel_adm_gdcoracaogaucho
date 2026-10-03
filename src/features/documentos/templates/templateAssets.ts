import type { DocumentKind } from './documentTemplates';

/** Artes dos documentos (fundo com cabeçalho, ilustrações, rótulos e linhas). Trocar o arquivo troca o visual. */
export const TEMPLATE_IMAGES: Record<DocumentKind, number> = {
  registration: require('../../../../assets/documents/inscricao.jpg'),
  ticket: require('../../../../assets/documents/ingresso.jpg'),
  receipt: require('../../../../assets/documents/cupom.jpg')
};
