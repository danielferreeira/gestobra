@echo off
SETLOCAL

REM Verificar se o arquivo .env existe
IF NOT EXIST .env (
  echo Arquivo .env nao encontrado. Criando a partir do .env.example...
  copy .env.example .env
  echo Por favor, edite o arquivo .env com suas credenciais do Supabase.
  pause
  exit /b 1
)

REM Instalar dependências
echo Instalando dependencias...
call npm install

REM Verificar se o usuário deseja configurar o Supabase
set /p configurar_supabase=Deseja configurar o Supabase? (s/n): 
if /i "%configurar_supabase%"=="s" (
  echo Configurando Supabase...
  call npm run setup-supabase
)

REM Iniciar o servidor de desenvolvimento
echo Iniciando o servidor de desenvolvimento...
call npm run dev

ENDLOCAL 