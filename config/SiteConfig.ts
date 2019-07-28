export default {
  pathPrefix: '/', // Prefix for all links. If you deploy your site to example.com/portfolio your pathPrefix should be "portfolio"

  siteTitle: 'Coding with J.S.', // Navigation and Site Title
  siteTitleAlt: 'Jordi Sicart on JavaScript', // Alternative Site title for SEO
  siteUrl: 'https://typescript-power-blog.github.com', // Domain of your site. No trailing slash!
  siteLanguage: 'en', // Language Tag on <html> element
  siteBanner: '/assets/banner.jpg', // Your image for og:image tag. You can find it in the /static folder
  defaultBg: '/assets/bg/canigou.jpg', // default post background header
  favicon: 'src/favicon.png', // Your image for favicons. You can find it in the /src folder
  siteDescription: "Let's explore JS", // Your site description
  author: 'Jordi Sicart', // Author for schemaORGJSONLD
  siteLogo:
    'https://media.licdn.com/dms/image/C4D03AQE8BC9DkcIC9g/profile-displayphoto-shrink_200_200/0?e=1567036800&v=beta&t=ZIag8uex7p0-hYl_O7qjRppuEk0F6lafgtkaRmHsmIw', // Image for schemaORGJSONLD

  // siteFBAppID: '123456789', // Facebook App ID - Optional
  userTwitter: '@jorditeddy', // Twitter Username - Optional
  ogLanguage: 'en_US', // Facebook Language

  // Manifest and Progress color
  // See: https://developers.google.com/web/fundamentals/web-app-manifest/
  themeColor: '#3498DB',
  backgroundColor: '#2b2e3c',

  // Settings for typography.ts
  headerFontFamily: 'Bitter',
  bodyFontFamily: 'Open Sans',
  baseFontSize: '18px',

  // Social media
  siteFBAppID: '',

  //
  Google_Tag_Manager_ID: null,
  POST_PER_PAGE: 4,
};
