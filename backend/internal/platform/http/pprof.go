package http

import (
	"net/http/pprof"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/middleware"
)

func registerPprofRoutes(r *gin.Engine) {
	if !pprofEnabled() {
		return
	}

	debug := r.Group("/debug")
	debug.Use(middleware.DebugAccessGuard())
	{
		debug.GET("/pprof/", gin.WrapF(pprof.Index))
		debug.GET("/pprof/cmdline", gin.WrapF(pprof.Cmdline))
		debug.GET("/pprof/profile", gin.WrapF(pprof.Profile))
		debug.POST("/pprof/symbol", gin.WrapF(pprof.Symbol))
		debug.GET("/pprof/symbol", gin.WrapF(pprof.Symbol))
		debug.GET("/pprof/trace", gin.WrapF(pprof.Trace))
		debug.GET("/pprof/allocs", gin.WrapH(pprof.Handler("allocs")))
		debug.GET("/pprof/block", gin.WrapH(pprof.Handler("block")))
		debug.GET("/pprof/goroutine", gin.WrapH(pprof.Handler("goroutine")))
		debug.GET("/pprof/heap", gin.WrapH(pprof.Handler("heap")))
		debug.GET("/pprof/mutex", gin.WrapH(pprof.Handler("mutex")))
		debug.GET("/pprof/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
	}
}

func pprofEnabled() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("ENABLE_PPROF")))
	return raw == "1" || raw == "true" || raw == "yes"
}
