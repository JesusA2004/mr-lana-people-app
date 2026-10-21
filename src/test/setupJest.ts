/* Mocks globales de Jest para módulos nativos que no existen en Node. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- el mock oficial se carga con require dentro de jest.mock.
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
