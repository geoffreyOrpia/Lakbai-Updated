import * as WebBrowser from 'expo-web-browser';

const SEARCH_ENDPOINT = 'https://www.google.com/search?q=';
const DIRECTIONS_ENDPOINT = 'https://www.google.com/maps/dir/?api=1';

const buildSearchUrl = (query) => `${SEARCH_ENDPOINT}${encodeURIComponent(query)}`;

const buildDirectionsUrl = ({ destination }) => (
  `${DIRECTIONS_ENDPOINT}&destination=${encodeURIComponent(destination)}&travelmode=driving`
);

const browserOptions = {
  toolbarColor: '#FFFFFF',
  controlsColor: '#0E7A4E',
  dismissButtonStyle: 'close',
  enableBarCollapsing: true,
  showTitle: true,
};

export const createOnlineResearchService = () => ({
  openSearch: (query) => WebBrowser.openBrowserAsync(buildSearchUrl(query), browserOptions),
  openDirections: (route) => WebBrowser.openBrowserAsync(buildDirectionsUrl(route), browserOptions),
});
