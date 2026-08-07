import serverless from "serverless-http";
import app from "../../server/index";

const expressHandler = serverless(app);
const functionPrefix = "/.netlify/functions/api";

interface NetlifyEvent extends Record<string, unknown> {
  path?: string;
  rawPath?: string;
}

// Netlify removes the /api prefix when it expands the redirect splat. Put it
// back before handing the request to Express, whose routes are /api/*.
export const handler = (event: NetlifyEvent, context: Record<string, unknown>) => {
  const originalPath = event.path || "/";
  const pathWithoutFunctionPrefix = originalPath.startsWith(functionPrefix)
    ? originalPath.slice(functionPrefix.length) || "/"
    : originalPath;

  event.path = pathWithoutFunctionPrefix.startsWith("/api")
    ? pathWithoutFunctionPrefix
    : `/api${pathWithoutFunctionPrefix}`;
  event.rawPath = event.path;

  return expressHandler(event, context);
};