import { IDynamoTimeEntry, RequiredKeys } from '@types';

const indexMapper = (indexName: RequiredKeys<IDynamoTimeEntry>): string =>
  `${indexName}-index`;

export default {
  STATUS: indexMapper('status'),
  SYNCED: indexMapper('synced'),
  SECONDS_LOGGED: indexMapper('secondsLogged'),
  CREATION_DATE_TIME: indexMapper('creationDateTime'),
  UPDATE_DATE_TIME: indexMapper('updateDateTime'),
  IS_THESIS: indexMapper('isThesisEntry'),
};
