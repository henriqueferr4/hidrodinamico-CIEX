import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Em desenvolvimento, serve a pasta data/ da raiz do repositório em /data
// (em produção esses arquivos vêm do volume montado no nginx).
// Se essa pasta não existir (ex.: repositório da demo), /data é servido
// normalmente a partir de public/data.
const PASTA_DADOS = path.resolve(__dirname, '../data')

function servirDados() {
  return {
    name: 'servir-dados',
    apply: 'serve',
    configureServer(server) {
      if (!fs.existsSync(PASTA_DADOS)) return
      server.middlewares.use('/data', (req, res) => {
        const naoEncontrado = () => {
          res.statusCode = 404
          res.end()
        }

        const relativo = decodeURIComponent(req.url.split('?')[0])
        const arquivo = path.join(PASTA_DADOS, relativo)

        // Bloqueia caminhos fora da pasta de dados
        if (!arquivo.startsWith(PASTA_DADOS + path.sep)) return naoEncontrado()

        fs.stat(arquivo, (erro, info) => {
          if (erro || !info.isFile()) return naoEncontrado()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Content-Length', info.size)
          fs.createReadStream(arquivo).pipe(res)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), servirDados()],
})
