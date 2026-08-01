import RetailAnalysis from "./RetailAnalysis";

/**
 * When bundled as an MCP widget, the NitroStack CLI bootstrap renders this
 * component with the tool output as a `data` prop:
 *
 *   reactRoot.render(React.createElement(WidgetPage, { data }))
 *
 * Props are typed loosely because Next's App Router page-props check rejects
 * any prop outside its own PageProps shape. In the standalone browser flow the
 * prop is absent and the analysis is read from session storage instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AnalysisPage(props: any) {
  return <RetailAnalysis data={props?.data} />;
}
