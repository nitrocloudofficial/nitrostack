declare global {
  const appendCorsHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').appendCorsHeaders
  const appendCorsPreflightHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').appendCorsPreflightHeaders
  const appendHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').appendHeader
  const appendHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').appendHeaders
  const appendResponseHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').appendResponseHeader
  const appendResponseHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').appendResponseHeaders
  const assertMethod: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').assertMethod
  const cachedEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/cache').cachedEventHandler
  const cachedFunction: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/cache').cachedFunction
  const callNodeListener: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').callNodeListener
  const clearResponseHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').clearResponseHeaders
  const clearSession: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').clearSession
  const createApp: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').createApp
  const createAppEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').createAppEventHandler
  const createError: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').createError
  const createEvent: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').createEvent
  const createEventStream: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').createEventStream
  const createRouter: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').createRouter
  const defaultContentType: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defaultContentType
  const defineCachedEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/cache').defineCachedEventHandler
  const defineCachedFunction: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/cache').defineCachedFunction
  const defineEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineEventHandler
  const defineLazyEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineLazyEventHandler
  const defineNitroErrorHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/error/utils').defineNitroErrorHandler
  const defineNitroPlugin: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/plugin').defineNitroPlugin
  const defineNodeListener: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineNodeListener
  const defineNodeMiddleware: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineNodeMiddleware
  const defineRenderHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/renderer').defineRenderHandler
  const defineRequestMiddleware: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineRequestMiddleware
  const defineResponseMiddleware: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineResponseMiddleware
  const defineRouteMeta: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/meta').defineRouteMeta
  const defineTask: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/task').defineTask
  const defineWebSocket: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineWebSocket
  const defineWebSocketHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').defineWebSocketHandler
  const deleteCookie: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').deleteCookie
  const dynamicEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').dynamicEventHandler
  const eventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').eventHandler
  const fetchWithEvent: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').fetchWithEvent
  const fromNodeMiddleware: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').fromNodeMiddleware
  const fromPlainHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').fromPlainHandler
  const fromWebHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').fromWebHandler
  const getCookie: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getCookie
  const getHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getHeader
  const getHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getHeaders
  const getMethod: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getMethod
  const getProxyRequestHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getProxyRequestHeaders
  const getQuery: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getQuery
  const getRequestFingerprint: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestFingerprint
  const getRequestHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestHeader
  const getRequestHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestHeaders
  const getRequestHost: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestHost
  const getRequestIP: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestIP
  const getRequestPath: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestPath
  const getRequestProtocol: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestProtocol
  const getRequestURL: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestURL
  const getRequestWebStream: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRequestWebStream
  const getResponseHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getResponseHeader
  const getResponseHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getResponseHeaders
  const getResponseStatus: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getResponseStatus
  const getResponseStatusText: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getResponseStatusText
  const getRouteRules: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/route-rules').getRouteRules
  const getRouterParam: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRouterParam
  const getRouterParams: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getRouterParams
  const getSession: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getSession
  const getValidatedQuery: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getValidatedQuery
  const getValidatedRouterParams: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').getValidatedRouterParams
  const handleCacheHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').handleCacheHeaders
  const handleCors: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').handleCors
  const isCorsOriginAllowed: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isCorsOriginAllowed
  const isError: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isError
  const isEvent: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isEvent
  const isEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isEventHandler
  const isMethod: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isMethod
  const isPreflightRequest: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isPreflightRequest
  const isStream: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isStream
  const isWebResponse: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').isWebResponse
  const lazyEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').lazyEventHandler
  const nitroPlugin: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/plugin').nitroPlugin
  const parseCookies: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').parseCookies
  const promisifyNodeListener: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').promisifyNodeListener
  const proxyRequest: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').proxyRequest
  const readBody: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').readBody
  const readFormData: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').readFormData
  const readMultipartFormData: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').readMultipartFormData
  const readRawBody: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').readRawBody
  const readValidatedBody: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').readValidatedBody
  const removeResponseHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').removeResponseHeader
  const runTask: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/task').runTask
  const sanitizeStatusCode: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sanitizeStatusCode
  const sanitizeStatusMessage: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sanitizeStatusMessage
  const sealSession: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sealSession
  const send: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').send
  const sendError: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendError
  const sendIterable: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendIterable
  const sendNoContent: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendNoContent
  const sendProxy: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendProxy
  const sendRedirect: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendRedirect
  const sendStream: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendStream
  const sendWebResponse: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').sendWebResponse
  const serveStatic: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').serveStatic
  const setCookie: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').setCookie
  const setHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').setHeader
  const setHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').setHeaders
  const setResponseHeader: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').setResponseHeader
  const setResponseHeaders: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').setResponseHeaders
  const setResponseStatus: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').setResponseStatus
  const splitCookiesString: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').splitCookiesString
  const toEventHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').toEventHandler
  const toNodeListener: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').toNodeListener
  const toPlainHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').toPlainHandler
  const toWebHandler: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').toWebHandler
  const toWebRequest: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').toWebRequest
  const unsealSession: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').unsealSession
  const updateSession: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').updateSession
  const useAppConfig: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/config').useAppConfig
  const useBase: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').useBase
  const useEvent: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/context').useEvent
  const useNitroApp: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/app').useNitroApp
  const useRuntimeConfig: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/config').useRuntimeConfig
  const useSession: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').useSession
  const useStorage: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/dist/runtime/internal/storage').useStorage
  const writeEarlyHints: typeof import('../../../../../../../AppData/Roaming/npm/node_modules/nitropack/node_modules/h3').writeEarlyHints
}
export { useNitroApp } from 'nitropack/runtime/internal/app';
export { useRuntimeConfig, useAppConfig } from 'nitropack/runtime/internal/config';
export { defineNitroPlugin, nitroPlugin } from 'nitropack/runtime/internal/plugin';
export { defineCachedFunction, defineCachedEventHandler, cachedFunction, cachedEventHandler } from 'nitropack/runtime/internal/cache';
export { useStorage } from 'nitropack/runtime/internal/storage';
export { defineRenderHandler } from 'nitropack/runtime/internal/renderer';
export { defineRouteMeta } from 'nitropack/runtime/internal/meta';
export { getRouteRules } from 'nitropack/runtime/internal/route-rules';
export { useEvent } from 'nitropack/runtime/internal/context';
export { defineTask, runTask } from 'nitropack/runtime/internal/task';
export { defineNitroErrorHandler } from 'nitropack/runtime/internal/error/utils';
export { appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, callNodeListener, clearResponseHeaders, clearSession, createApp, createAppEventHandler, createError, createEvent, createEventStream, createRouter, defaultContentType, defineEventHandler, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, fromNodeMiddleware, fromPlainHandler, fromWebHandler, getCookie, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, isCorsOriginAllowed, isError, isEvent, isEventHandler, isMethod, isPreflightRequest, isStream, isWebResponse, lazyEventHandler, parseCookies, promisifyNodeListener, proxyRequest, readBody, readFormData, readMultipartFormData, readRawBody, readValidatedBody, removeResponseHeader, sanitizeStatusCode, sanitizeStatusMessage, sealSession, send, sendError, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, unsealSession, updateSession, useBase, useSession, writeEarlyHints } from 'h3';