import Script from "next/script";
import Head from "next/head";
import dynamic from "next/dynamic";
import "../styles/globals.css";
import { WebMCP } from "../components/WebMCP";

const PageSchema = dynamic(
  () => import("../components/PageSchema").then((m) => m.PageSchema),
  { ssr: false }
);

function WebPerfSnippets({ Component, pageProps }) {
  return (
    <>
      <Head>
        <PageSchema />
      </Head>
      <WebMCP />
      <Component {...pageProps} />
      <Script
        src="https://cdn.debugbear.com/BK73p0yToVVP.js"
        strategy="afterInteractive"
      />
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-NNX9SYKEV2"></Script>
      <Script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments)}
          gtag('js', new Date());

          gtag('config', 'G-NNX9SYKEV2');
        `}
      </Script>
    </>
  );
}

export default WebPerfSnippets;
