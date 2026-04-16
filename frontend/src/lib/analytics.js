import ReactGA from 'react-ga4';

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const initGA = () => {
  if (GA_ID) ReactGA.initialize(GA_ID);
};

export const trackPage = (path) => {
  if (GA_ID) ReactGA.send({ hitType: 'pageview', page: path });
};

export const trackEvent = (category, action, label) => {
  if (GA_ID) ReactGA.event({ category, action, label });
};
