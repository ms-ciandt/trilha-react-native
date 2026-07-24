---
title: Code Signing and Fastlane for React Native iOS
---

# Code Signing e Fastlane para React Native iOS

Como desenvolvedor iOS, você ja entende code signing em nivel conceitual. Certificados, provisioning profiles e o Apple Developer Portal nao sao novidade. O que e novo e fazer tudo isso de forma repetivel em um time e em uma maquina de CI sem que uma pessoa precise clicar pelo Xcode a cada vez. Este documento mapeia seu conhecimento existente para o contexto do React Native e mostra como o Fastlane resolve o problema de automacao.

## Conceitos de Code Signing — O Que Voce Ja Conhece

### Certificados

A Apple emite dois tipos de certificados de assinatura:

**Certificado de desenvolvimento** — usado ao compilar para um dispositivo fisico durante o desenvolvimento local. O Xcode assina o binario com esse certificado, e o dispositivo o aceita porque a cadeia de certificados remonta a Apple. Seu certificado de desenvolvimento pessoal esta vinculado ao seu Apple ID.

**Certificado de distribuicao** — usado ao compilar um binario para o TestFlight ou para submissao na App Store. A chave privada desse certificado deve estar acessivel em qualquer maquina que compile um IPA de release. E aqui que os times enfrentam problemas: a chave privada fica no Keychain de quem gerou o certificado, nao no repositorio, e nao automaticamente em uma maquina de CI.

### Provisioning Profiles

Um provisioning profile e um envelope assinado que une tres elementos:

- **App ID** — o bundle identifier (`com.yourcompany.yourapp`), opcionalmente com capabilities (Push Notifications, Sign in with Apple, App Groups)
- **Dispositivos** — para perfis de desenvolvimento e ad-hoc, uma lista explicita de UDIDs autorizados a executar o app; para perfis da App Store, todos os dispositivos implicitamente
- **Certificado** — o certificado de assinatura cuja chave publica o perfil incorpora

Quatro tipos de perfil correspondem a quatro cenarios de distribuicao:

| Tipo de perfil | Caso de uso |
|---|---|
| Development | Testes em dispositivo local, builds de debug |
| Ad Hoc | Distribuicao para uma lista fixa de dispositivos de teste |
| App Store | Submissao ao TestFlight e a App Store |
| Enterprise | Distribuicao interna (requer conta Enterprise) |

O perfil e um arquivo com extensao `.mobileprovision`. O Xcode o incorpora ao bundle do app como `embedded.mobileprovision`. Na inicializacao, o iOS verifica se o certificado usado para assinar o binario corresponde ao que esta no perfil incorporado, e se o dispositivo esta na lista permitida (para desenvolvimento/ad-hoc).

### Apple Developer Portal

O Developer Portal em developer.apple.com e onde voce:

- Cria e revoga certificados
- Registra UDIDs de dispositivos
- Cria App IDs e configura capabilities
- Cria e baixa provisioning profiles

Alteracoes em capabilities (adicionar Push Notifications, por exemplo) invalidam provisioning profiles existentes. Voce deve regenerar e baixar novamente o perfil, depois atualizar a referencia do Xcode a ele. Esse ciclo de regeneracao e o que torna a assinatura manual fragil em um time.

## Assinatura Automatica vs Manual no Xcode

### Assinatura Automatica

Nas configuracoes do projeto no Xcode, na aba "Signing and Capabilities", habilitar "Automatically manage signing" delega todo o gerenciamento de certificados e perfis ao Xcode. O Xcode cria certificados em seu nome, cria perfis que correspondem ao seu bundle ID e ao time selecionado, e resolve conflitos automaticamente.

A assinatura automatica funciona bem para um unico desenvolvedor compilando para seu proprio dispositivo. Para o React Native especificamente, e o padrao apos `npx react-native init` e adequada para builds de desenvolvimento.

Ela falha em CI porque:

- Maquinas de CI nao possuem Keychain com credenciais de assinatura pre-configuradas
- A assinatura automatica chama APIs da Apple em tempo de build, exigindo uma sessao autenticada com Apple ID
- Sessoes interativas com Apple ID nao podem ser automatizadas sem solucoes de contorno para 2FA

### Assinatura Manual

Assinatura manual significa que voce especifica explicitamente qual certificado e provisioning profile o Xcode deve usar para cada configuracao. Em `ios/YourApp.xcodeproj`, abra as configuracoes do target e defina:

- `CODE_SIGN_STYLE = Manual`
- `PROVISIONING_PROFILE_SPECIFIER = <nome ou UUID do perfil>`
- `CODE_SIGN_IDENTITY = "Apple Distribution"` (para builds de release)

Ao compilar pela linha de comando via `xcodebuild`, passe essas configuracoes como build settings:

```bash
xcodebuild archive \
  -workspace ios/YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath /tmp/YourApp.xcarchive \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="match AppStore com.yourcompany.yourapp" \
  DEVELOPMENT_TEAM=YOURTEAMID
```

A assinatura manual exige que o certificado e o perfil estejam instalados antes de o build ser executado. Em CI, isso significa instalar o certificado em um Keychain temporario e copiar o perfil para `~/Library/MobileDevice/Provisioning Profiles/`. O Fastlane Match lida com ambos automaticamente.

## Fastlane Match

O Match e a ferramenta do Fastlane que resolve o problema de "rotatividade de certificados". O problema: quando um membro do time gera um novo certificado de distribuicao, o antigo e revogado pela Apple (que limita o numero de certificados ativos por conta), quebrando o Keychain de todos os outros membros do time e de todas as maquinas de CI que tinham o certificado anterior instalado.

A abordagem do Match: armazenar todos os certificados e provisioning profiles em um unico repositorio Git privado, criptografado com uma senha. Cada desenvolvedor e cada runner de CI sincroniza a partir desse repositorio em vez de gerenciar suas proprias credenciais. O repo Git privado se torna a fonte de verdade para a identidade de assinatura.

### Inicializando o Match

Execute uma vez, a partir de uma maquina com acesso a sua conta do Apple Developer Portal:

```bash
bundle exec fastlane match init
```

O Match solicita:

- A URL do repositorio Git privado (crie um repo privado vazio primeiro)
- O ID do seu time no Apple Developer

Isso grava um `Matchfile` em `fastlane/`:

```ruby
# fastlane/Matchfile
git_url("https://github.com/yourorg/yourapp-certificates")

storage_mode("git")

type("appstore")   # default type to sync

app_identifier(["com.yourcompany.yourapp"])
username("ci@yourcompany.com")  # Apple ID used to access Developer Portal
```

### Gerando Certificados e Perfis

Gere e armazene um certificado e provisioning profile para a App Store:

```bash
bundle exec fastlane match appstore
```

Gere para desenvolvimento:

```bash
bundle exec fastlane match development
```

O Match cria o certificado no Developer Portal se ele nao existir, faz o download, criptografa e envia ao repositorio Git. Certificados existentes sao reutilizados enquanto forem validos — o Match nao revoga e recria a menos que voce passe explicitamente `--force`.

### Sincronizando em CI

Em CI, use `readonly: true` para impedir que o Match tente criar ou modificar credenciais. Ele apenas faz o download e a instalacao:

```bash
bundle exec fastlane match appstore --readonly
```

O Match instala o certificado em um Keychain temporario e copia o provisioning profile para `~/Library/MobileDevice/Provisioning Profiles/`. Apos essa etapa, o `xcodebuild` consegue localizar ambos pelo nome.

Forneca as credenciais do repositorio Git e a senha de criptografia do Match como segredos de CI:

```bash
MATCH_PASSWORD=<encryption passphrase>
MATCH_GIT_BASIC_AUTHORIZATION=<base64 username:token>
```

`MATCH_GIT_BASIC_AUTHORIZATION` e a codificacao em base64 de `username:personal-access-token` para o repositorio privado de certificados.

## Fastlane Gym

O Gym e a action do Fastlane que encapsula o processo de build iOS em duas etapas: `xcodebuild archive` seguido de `xcodebuild -exportArchive`. O resultado e um arquivo `.ipa` pronto para distribuicao.

Sem o gym, os comandos shell equivalentes sao:

```bash
# Etapa 1 — produz um .xcarchive
xcodebuild archive \
  -workspace ios/YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  -archivePath /tmp/YourApp.xcarchive

# Etapa 2 — exporta um .ipa a partir do archive
xcodebuild -exportArchive \
  -archivePath /tmp/YourApp.xcarchive \
  -exportPath /tmp/YourApp-ipa \
  -exportOptionsPlist ios/ExportOptions.plist
```

O `ExportOptions.plist` especifica o metodo de exportacao, o provisioning profile e a identidade de assinatura. O Gym gera esse arquivo automaticamente com base em seus parametros.

Usando o gym em uma lane do Fastfile:

```ruby
build_app(
  workspace: "ios/YourApp.xcworkspace",
  scheme: "YourApp",
  configuration: "Release",
  export_method: "app-store",
  export_options: {
    provisioningProfiles: {
      "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp"
    }
  },
  output_directory: "/tmp/ios-build",
  output_name: "YourApp.ipa",
  include_symbols: true,
  include_bitcode: false
)
```

`build_app` e o alias moderno para `gym`. Os dois nomes sao intercambiaveis.

A etapa de archive compila o app e suas dependencias em um `.xcarchive` — um diretorio contendo o binario compilado, arquivos de simbolos dSYM e metadados. A etapa de exportacao extrai o `.ipa` do archive e o assina com o certificado correspondente ao provisioning profile especificado.

## Fastlane Pilot

O Pilot faz o upload de um `.ipa` compilado para o TestFlight. Ele encapsula a API do App Store Connect e lida com a autenticacao, o upload do binario e a atribuicao opcional a grupos.

```ruby
upload_to_testflight(
  ipa: "/tmp/ios-build/YourApp.ipa",
  skip_waiting_for_build_processing: true,
  groups: ["Internal QA", "Beta Testers"],
  changelog: "Release #{ENV['VERSION']} — see git log for details"
)
```

`upload_to_testflight` e o alias moderno para `pilot`.

`skip_waiting_for_build_processing: true` retorna imediatamente apos o upload, em vez de ficar consultando ate o processamento da Apple ser concluido (o que pode levar de 10 a 30 minutos). Para pipelines de CI, pular essa espera mantem a duracao do job razoavel. O build fica disponivel no TestFlight assim que a revisao automatica do binario feita pela Apple for concluida.

Se voce precisar que o build esteja imediatamente disponivel para os testadores antes do termino do job de CI, remova `skip_waiting_for_build_processing` ou defina como `false`:

```ruby
upload_to_testflight(
  skip_waiting_for_build_processing: false,
  wait_processing_timeout_duration: 1800  # max seconds to wait (30 min)
)
```

## Fastlane Deliver

O Deliver submete um build concluido do TestFlight para revisao na App Store e faz o upload de metadados: descricao do app, palavras-chave, capturas de tela e notas de versao. Ele encapsula a API do App Store Connect.

```ruby
deliver(
  app_identifier: "com.yourcompany.yourapp",
  submit_for_review: true,
  force: true,   # skip interactive confirmation
  metadata_path: "./fastlane/metadata",
  screenshots_path: "./fastlane/screenshots",
  phased_release: true,
  automatic_release: false,   # manual release after Apple approval
  submission_information: {
    add_id_info_uses_idfa: false,
    export_compliance_uses_encryption: false,
    content_rights_has_rights: true,
    content_rights_contains_third_party_content: false
  }
)
```

`upload_to_app_store` e o alias moderno para `deliver`.

O diretorio `metadata_path` segue uma estrutura especifica gerenciada pelo Fastlane. Apos executar `fastlane deliver init`, o Fastlane baixa seus metadados atuais do App Store Connect e cria a estrutura de pastas:

```
fastlane/metadata/
  en-US/
    description.txt
    keywords.txt
    release_notes.txt
    name.txt
    subtitle.txt
  pt-BR/
    description.txt
    ...
```

Edite esses arquivos e entao o `deliver` os envia. Isso mantem os metadados da App Store no controle de versao junto com o codigo.

## Anatomia do Appfile e do Fastfile

### Appfile

O Appfile armazena configuracoes em nivel de app compartilhadas pela maioria das lanes, evitando repeticao em cada chamada de action:

```ruby
# fastlane/Appfile
app_identifier("com.yourcompany.yourapp")
apple_id("ci@yourcompany.com")
team_id("YOURTEAMID")  # 10-character Apple Developer team ID
itc_team_id("YOURITUNESID")  # numeric iTunes Connect team ID (if different from team_id)
```

Actions como `match`, `pilot` e `deliver` leem esses valores automaticamente. Voce so precisa sobrescreve-los em uma lane especifica ao trabalhar com multiplos targets ou multiplas contas Apple.

### Fastfile

O Fastfile e um arquivo DSL em Ruby que define lanes. Cada lane e uma sequencia nomeada de actions:

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do

  before_all do
    # Runs before every lane on this platform
    ensure_bundle_exec  # enforces `bundle exec fastlane` rather than bare `fastlane`
  end

  desc "Sync code signing credentials from the Match git repo"
  lane :sync_signing do
    app_store_connect_api_key(
      key_id: ENV['ASC_KEY_ID'],
      issuer_id: ENV['ASC_ISSUER_ID'],
      key_content: ENV['ASC_API_KEY'],
      in_house: false
    )
    match(type: "appstore", readonly: true)
  end

  desc "Build a signed IPA"
  lane :build do
    sync_signing
    build_app(
      workspace: "ios/YourApp.xcworkspace",
      scheme: "YourApp",
      configuration: "Release",
      export_method: "app-store",
      export_options: {
        provisioningProfiles: {
          "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp"
        }
      },
      output_directory: "/tmp/ios-build"
    )
  end

  desc "Upload to TestFlight"
  lane :beta do
    build
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      groups: ["Internal QA"]
    )
  end

  desc "Submit to App Store"
  lane :release do
    build
    upload_to_app_store(
      submit_for_review: true,
      phased_release: true,
      automatic_release: false
    )
  end

  after_all do |lane|
    # Runs after every successful lane
    # Useful for Slack notifications, git tagging, etc.
  end

  error do |lane, exception|
    # Runs if any lane fails
    UI.error("Lane #{lane} failed: #{exception.message}")
  end

end
```

### Composicao de Lanes

Lanes podem chamar outras lanes, possibilitando reuso sem duplicacao. No exemplo acima, `beta` chama `build`, e `build` chama `sync_signing`. Isso e composicao de lanes.

Para um projeto React Native com multiplos targets (por exemplo, um app principal e uma extensao de servico de notificacao), voce pode passar parametros:

```ruby
lane :sync_signing do |options|
  type = options[:type] || "appstore"
  identifiers = options[:identifiers] || ["com.yourcompany.yourapp"]

  match(
    type: type,
    app_identifier: identifiers,
    readonly: true
  )
end

lane :release do
  # Sync credentials for both targets in one call
  sync_signing(
    type: "appstore",
    identifiers: [
      "com.yourcompany.yourapp",
      "com.yourcompany.yourapp.NotificationService"
    ]
  )

  build_app(
    workspace: "ios/YourApp.xcworkspace",
    scheme: "YourApp",
    export_method: "app-store",
    export_options: {
      provisioningProfiles: {
        "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp",
        "com.yourcompany.yourapp.NotificationService" =>
          "match AppStore com.yourcompany.yourapp.NotificationService"
      }
    }
  )

  upload_to_testflight(skip_waiting_for_build_processing: true)
end
```

## Chave de API do App Store Connect

Sessoes interativas com Apple ID (email + senha + 2FA) nao podem ser automatizadas em CI. A Apple oferece uma alternativa: chaves de API sem etapa de autenticacao interativa.

No App Store Connect, acesse Users and Access > Integrations > App Store Connect API. Gere uma chave com a funcao "App Manager" ou "Developer". Baixe o arquivo `.p8` uma unica vez — a Apple nao permite baixa-lo novamente.

Passe a chave ao Fastlane por meio de variaveis de ambiente:

```bash
ASC_KEY_ID=<10-char key ID>
ASC_ISSUER_ID=<UUID from the API Keys page>
ASC_API_KEY=<contents of the .p8 file, single line or multiline>
```

No Fastfile, chame `app_store_connect_api_key` no inicio de qualquer lane que se comunique com o App Store Connect (Match, Pilot, Deliver):

```ruby
lane :release do
  app_store_connect_api_key(
    key_id: ENV['ASC_KEY_ID'],
    issuer_id: ENV['ASC_ISSUER_ID'],
    key_content: ENV['ASC_API_KEY'],
    in_house: false
  )

  match(type: "appstore", readonly: true)
  build_app(...)
  upload_to_testflight(...)
end
```

A sessao da chave de API e armazenada em um contexto compartilhado e reutilizada pelas actions subsequentes na mesma execucao da lane. Nao e necessario passa-la a cada action individualmente.

## Executando Localmente vs em CI

A partir de uma maquina de desenvolvedor:

```bash
# Install Ruby dependencies
bundle install

# Sync signing for local builds
bundle exec fastlane ios sync_signing

# Build and upload to TestFlight
bundle exec fastlane ios beta
```

Em CI (trecho do GitHub Actions):

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.3'
    bundler-cache: true

- name: Install Node dependencies
  run: npm ci

- name: Install CocoaPods
  run: cd ios && pod install --repo-update
  env:
    COCOAPODS_DISABLE_STATS: true

- name: Build and distribute
  run: bundle exec fastlane ios release
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_AUTH }}
    ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
    ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
    ASC_API_KEY: ${{ secrets.ASC_API_KEY }}
```

O runner de CI nao precisa de certificados pre-instalados nem de contas Apple. O Match instala tudo a partir do repositorio Git privado usando a senha e o token Git dos segredos.

## Resumo

Seu conhecimento de code signing para iOS se aplica diretamente: certificados identificam quem assinou o binario, provisioning profiles vinculam um certificado a um App ID e a um conjunto de dispositivos, e o Apple Developer Portal e a autoridade que emite ambos. A diferenca no contexto de um time React Native e de escala — o gerenciamento manual falha quando mais de uma pessoa ou maquina precisa compilar um binario de release.

O Fastlane Match resolve o problema de distribuicao mantendo todas as credenciais de assinatura em um unico repositorio Git criptografado. O Gym encapsula o processo de duas etapas de `xcodebuild archive` e `xcodebuild -exportArchive` em uma unica chamada parametrizada. O Pilot faz o upload para o TestFlight, e o Deliver lida com a submissao na App Store com metadados. O Fastfile compos essas etapas em lanes nomeadas que o CI pode invocar sem sessoes interativas, usando chaves de API do App Store Connect em vez de senhas de Apple ID.
