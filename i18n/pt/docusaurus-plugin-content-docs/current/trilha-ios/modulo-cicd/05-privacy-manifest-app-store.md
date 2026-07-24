---
title: Privacy Manifest and App Store Submission
---

# Privacy Manifest e Submissão na App Store

A Apple introduziu o requisito de privacy manifest com o iOS 17 e o tornou obrigatório para todas as submissões na App Store a partir da primavera de 2024. Para desenvolvedores React Native, esse requisito traz complexidade adicional porque o próprio framework acessa internamente diversas APIs sensíveis à privacidade, o que significa que seu app precisa declarar razões para o uso de APIs que o seu próprio código pode nunca chamar diretamente.

Este documento explica cada parte do privacy manifest para apps React Native, como criá-lo e validá-lo, e o que esperar durante a revisão da App Store.

## Por que os Privacy Manifests Existem

O sistema de privacy manifest fornece à Apple e aos usuários um registro legível por máquina de quais APIs sensíveis um app (ou qualquer SDK incluído) acessa e por quê. Antes desse requisito, SDKs de terceiros podiam acessar silenciosamente APIs como `UserDefaults` ou timestamps de arquivos sem nenhuma justificativa declarada. A Apple agora exige um arquivo `PrivacyInfo.xcprivacy` para qualquer app ou SDK que utilize um conjunto de APIs com razões designadas obrigatórias.

A ausência de declarações corretas resulta em rejeição durante a revisão da App Store, não durante o processo de build. O Xcode não impede você de submeter um manifest incompleto. A rejeição chega como um e-mail da equipe de revisão da App Store, geralmente dentro de 24 a 48 horas após a submissão.

## O Formato do Arquivo PrivacyInfo.xcprivacy

Um arquivo `PrivacyInfo.xcprivacy` é uma property list (plist) padrão da Apple com extensão `.xcprivacy`. Seu dicionário raiz pode conter três chaves de nível superior:

- `NSPrivacyAccessedAPITypes` — declara quais APIs com razões obrigatórias o app ou SDK usa e por quê
- `NSPrivacyCollectedDataTypes` — declara quais categorias de dados do usuário o app coleta
- `NSPrivacyTracking` — um booleano que declara se o app usa dados para rastreamento conforme definido pelo ATT

O Xcode renderiza esse arquivo em um editor estruturado quando você o abre, mas por baixo é XML puro. Você pode editar qualquer uma das representações.

## APIs com Razões Obrigatórias que o React Native Utiliza

Os componentes internos do React Native acessam diversas APIs com razões obrigatórias como parte do funcionamento normal do framework. Mesmo que o código da sua aplicação nunca importe essas APIs, você deve declará-las porque elas aparecem no binário linkado.

### NSUserDefaults

O React Native usa `NSUserDefaults` para persistir certas preferências de nível do framework. O sistema registra avisos sobre esse acesso e a Apple o sinaliza durante a revisão caso nenhuma razão seja declarada.

O código de razão correto para acesso a defaults em nível de framework, onde o uso não é motivado por armazenamento de dados iniciado pelo usuário, é `CA92.1`. Essa razão cobre leitura e escrita de valores em `NSUserDefaults` com o objetivo de armazenar estado necessário para o funcionamento do próprio app, sem transmitir esses dados para fora do dispositivo.

Em XML de plist, essa entrada tem a seguinte aparência:

```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>CA92.1</string>
    </array>
</dict>
```

### APIs de Timestamp de Arquivo (NSFileManager)

O runtime do Metro bundler do React Native, as camadas de cache de imagens e o código de resolução de assets leem timestamps de arquivos via `NSFileManager`. A categoria de API com razão obrigatória é `NSPrivacyAccessedAPICategoryFileTimestamp`.

A Apple fornece vários códigos de razão para acesso a timestamps de arquivo. O código apropriado para operações internas do framework onde timestamps são usados para invalidação de cache e não são expostos aos usuários é `C617.1`. Isso cobre a leitura de timestamps de arquivos que o próprio app criou ou gerencia.

Se seu app também lê explicitamente timestamps de arquivos para funcionalidades como exibir uma data de "última modificação" ao usuário, você declararia `DDA9.1` além de `C617.1`.

```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>C617.1</string>
    </array>
</dict>
```

### Tempo de Boot do Sistema (mach_absolute_time)

Os subsistemas de rastreamento de performance e animação do React Native usam `mach_absolute_time()` para medir intervalos de tempo com alta precisão. Isso se enquadra na categoria `NSPrivacyAccessedAPICategorySystemBootTime`.

O código de razão padrão para usar o tempo de boot para medir intervalos sem transmitir o tempo de atividade do dispositivo para fora do aparelho é `35F9.1`.

```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>35F9.1</string>
    </array>
</dict>
```

### APIs de Espaço em Disco

Algumas versões do React Native e SDKs comuns consultam o espaço disponível em disco por meio dos atributos do `NSFileManager`. Se a sua árvore de dependências incluir algum SDK que faça isso, a categoria `NSPrivacyAccessedAPICategoryDiskSpace` com razão `E174.1` (verificação de capacidade disponível antes de realizar uma operação) deve estar presente.

Execute um relatório de privacidade no Xcode para descobrir se algum dos seus frameworks linkados aciona essa categoria.

## Estrutura Completa de NSPrivacyAccessedAPITypes

Um app React Native mínimo geralmente requer pelo menos as três entradas principais. O array completo de `NSPrivacyAccessedAPITypes` no seu manifest deve ser:

```xml
<key>NSPrivacyAccessedAPITypes</key>
<array>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>CA92.1</string>
        </array>
    </dict>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>C617.1</string>
        </array>
    </dict>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>35F9.1</string>
        </array>
    </dict>
</array>
```

Ajuste o conjunto de entradas após executar seu próprio relatório de privacidade para capturar APIs adicionais introduzidas pelas suas dependências.

## Expo Managed Workflow

Se você estiver usando o Expo SDK 56 ou posterior, o managed workflow gerencia o privacy manifest automaticamente. O Expo CLI gera e incorpora um arquivo `PrivacyInfo.xcprivacy` durante a etapa de prebuild que cobre todas as APIs acessadas pelo runtime do Expo e pelos módulos do SDK incluídos no seu projeto.

Cada módulo Expo que acessa uma API com razão obrigatória inclui seu próprio `PrivacyInfo.xcprivacy` no seu pod. O CocoaPods mescla esses manifests por pod em um único manifest agregado para o binário final. Essa agregação é automática e acontece durante o `pod install`.

Para o managed workflow do Expo, sua responsabilidade se limita a declarar quaisquer APIs adicionais que o seu próprio código nativo customizado acessa. Se você não tiver módulos nativos customizados, o manifest gerado deve ser suficiente. Verifique isso executando um relatório de privacidade no Xcode após `npx expo prebuild --platform ios`.

## Bare Workflow: Criando o PrivacyInfo.xcprivacy Manualmente

No bare workflow, você deve criar e manter o manifest por conta própria. Siga estas etapas no Xcode.

### Criando o Arquivo

1. Abra seu projeto no Xcode abrindo o arquivo `.xcworkspace` (não o `.xcodeproj`).
2. No Project Navigator, selecione a pasta com o nome do seu app target (o grupo que contém `AppDelegate.swift` ou `AppDelegate.mm`).
3. Vá em File > New > File from Template.
4. No campo de filtro, digite "Privacy". Selecione o template "App Privacy" e clique em Next.
5. Nomeie o arquivo `PrivacyInfo.xcprivacy`. Confirme que o checkbox do target do seu app está selecionado. Clique em Create.

O Xcode coloca o arquivo dentro do grupo do seu app no Project Navigator e o adiciona automaticamente à fase de build de recursos do bundle do target.

### Localização Correta no Project Navigator

O arquivo `PrivacyInfo.xcprivacy` deve ser membro do seu app target, não de nenhum target de extensão ou framework. No Project Navigator, ele deve aparecer no mesmo nível dos seus outros arquivos de código, dentro do grupo que representa a pasta da sua aplicação.

Você pode verificar a associação selecionando o arquivo no Project Navigator e abrindo o File Inspector no painel direito. Em Target Membership, o checkbox do seu app target deve estar marcado.

Se você abrir o arquivo e o Xcode exibir o editor estruturado de privacidade (com seções para "Privacy Accessed API Types", "Privacy Collected Data Types" e "Privacy Tracking"), o arquivo está em um local reconhecido. Se o Xcode o abrir como XML bruto, clique com o botão direito no arquivo e escolha Open As > Property List.

### Adicionando Entradas no Editor Estruturado

O editor estruturado do Xcode para privacy manifests oferece menus para cada categoria e código de razão. Para adicionar uma entrada de API obrigatória:

1. Clique no botão de adição ao lado de "Privacy Accessed API Types".
2. Na coluna "Privacy Accessed API Type", selecione a categoria no menu suspenso (por exemplo, "User Defaults").
3. Expanda a linha e clique no botão de adição ao lado de "Privacy Accessed API Type Reasons".
4. Selecione o código de razão apropriado no menu suspenso.

Repita para cada categoria obrigatória.

## NSPrivacyCollectedDataTypes: Declarando Coleta de Dados

Além das APIs com razões obrigatórias, você deve declarar quaisquer dados do usuário que seu app coleta. Isso é separado das declarações de razão de API e mapeia diretamente para o rótulo de privacidade exibido na página do produto na App Store.

Tipos de dados comuns e seus valores de `NSPrivacyCollectedDataType`:

| Categoria de dado | Valor da chave |
|---|---|
| Nome | `NSPrivacyCollectedDataTypeName` |
| Endereço de e-mail | `NSPrivacyCollectedDataTypeEmailAddress` |
| Número de telefone | `NSPrivacyCollectedDataTypePhoneNumber` |
| Identificador de dispositivo | `NSPrivacyCollectedDataTypeDeviceID` |
| Dados de crash | `NSPrivacyCollectedDataTypeCrashData` |
| Dados de performance | `NSPrivacyCollectedDataTypePerformanceData` |

Para cada tipo de dado declarado, você também deve especificar:

- `NSPrivacyCollectedDataTypeLinked` — booleano, se esse dado está vinculado à identidade do usuário
- `NSPrivacyCollectedDataTypeTracking` — booleano, se esse dado é usado para rastreamento
- `NSPrivacyCollectedDataTypePurposes` — array de strings de propósito como `NSPrivacyCollectedDataTypePurposeAnalytics` ou `NSPrivacyCollectedDataTypePurposeAppFunctionality`

Se seu app React Native usar Crashlytics ou Sentry, você deve declarar a coleta de dados de crash. Se usar algum SDK de analytics, declare os identificadores relevantes. O manifest deve refletir o comportamento real de coleta de dados. Declarar menos do que o app realmente coleta constitui uma violação de política.

## Gerando um Relatório de Privacidade no Xcode

Antes da submissão, gere um relatório de privacidade para identificar todo o uso de APIs com razões obrigatórias no seu binário e nos frameworks linkados:

1. Faça o build do seu app para qualquer dispositivo ou simulador (Product > Build).
2. No Xcode, vá em Product > Archive se quiser um relatório completo para um build de distribuição, ou use Product > Build e então inspecione o binário.
3. No Xcode Organizer (Window > Organizer), selecione seu archive e clique em Generate Privacy Report.

O relatório lista cada API com razão obrigatória encontrada no binário e indica se cada uma possui uma declaração correspondente no seu manifest. Resolva todos os itens sinalizados antes de submeter.

## Padrões Comuns de Rejeição na App Store

### Razão Ausente para API de Timestamp de Arquivo

Esta é a rejeição mais frequente para apps React Native. O sistema de revisão da Apple detecta acesso a timestamps via `NSFileManager` no binário e não encontra nenhuma declaração no manifest. O e-mail de rejeição tem aproximadamente o seguinte conteúdo:

> ITMS-91053: Missing API declaration — Your app's code in the "YourApp.app" file accesses the following required reason API category: File timestamp APIs. Provide an approved reason in the manifest file.

Resolução: adicione a entrada `NSPrivacyAccessedAPICategoryFileTimestamp` com razão `C617.1` conforme mostrado acima, reconstrua e reenvie.

### Razão Ausente para UserDefaults

O código de inicialização da bridge do React Native lê `NSUserDefaults`. Se você submeteu sem `NSPrivacyAccessedAPICategoryUserDefaults` declarado, receberá uma rejeição semelhante. Resolução: adicione `CA92.1` como razão.

### Manifest Não Vinculado ao Target

Se você criou o arquivo `PrivacyInfo.xcprivacy` mas não o adicionou ao target correto, o archive não o incluirá e a rejeição se repetirá. Verifique a associação com o target no File Inspector antes de arquivar.

### Código de Razão Incorreto

Selecionar uma razão que não se aplica ao seu uso real é uma violação de política. A Apple pode aceitar a submissão inicialmente, mas pode rejeitar uma atualização ou revogar o app posteriormente. Use apenas códigos de razão que descrevam com precisão o uso real da API.

## Processo de Revisão na App Store para Apps React Native

### Revisão do Binário

A fase inicial de revisão examina seu binário iOS compilado. Os revisores verificam:

- Completude do privacy manifest
- Correspondência entre entitlements e capacidades declaradas
- Ausência de uso de APIs privadas
- Entradas de Info.plist para qualquer solicitação de permissão que seu app faz

Apps React Native passam pela revisão do binário de forma idêntica a apps nativos. O bundle JavaScript é incorporado como um asset no binário e não requer revisão separada nessa etapa.

### Política de Atualização do Bundle JavaScript

As diretrizes da Apple permitem que apps React Native atualizem seu bundle JavaScript over the air (OTA) sem uma nova submissão à App Store, desde que a atualização não altere materialmente a funcionalidade do app, adicione novas funcionalidades ou contorne o processo de revisão. Essa é a base política para ferramentas como EAS Update e CodePush.

O limite que os revisores aplicam: atualizações OTA podem corrigir bugs e fazer pequenos ajustes. Atualizações OTA não podem introduzir novas funcionalidades, alterar o propósito principal do app ou contornar sistemas de pagamento. Uma mudança significativa de funcionalidade deve passar por uma nova submissão à App Store mesmo que seja tecnicamente entregável via atualização do bundle JavaScript.

A Apple não revisa atualizações OTA individuais. A responsabilidade pela conformidade recai sobre o desenvolvedor. Violar essa política pode resultar na remoção do app.

### Revisão de Metadados

Junto com o binário, os revisores verificam os metadados do App Store Connect: capturas de tela, descrição do app, palavras-chave, classificação etária e categoria. Certifique-se de que as capturas de tela reflitam o estado atual do app. Capturas de tela desatualizadas ou enganosas causam rejeições não relacionadas à implementação técnica.

## Testes Externos via TestFlight

Antes de submeter para revisão na App Store, distribua via TestFlight para testadores externos. Builds externos do TestFlight passam por uma revisão mais curta (tipicamente 24 a 48 horas) que verifica crashes e violações de política, mas é menos minuciosa do que a revisão completa da App Store.

Os privacy manifests são verificados durante a revisão externa do TestFlight. Se o seu manifest estiver incompleto, você receberá uma rejeição durante a distribuição via TestFlight, permitindo que corrija o problema antes do ciclo completo de revisão. Este é um passo de validação muito útil.

Para distribuir externamente via TestFlight:

1. Archive o app no Xcode (Product > Archive).
2. No Organizer, selecione o archive e clique em Distribute App.
3. Escolha a distribuição App Store Connect.
4. Faça o upload para o App Store Connect.
5. No App Store Connect, navegue até a aba TestFlight, selecione o build e submeta para revisão externa.
6. Após aprovado, adicione testadores externos por e-mail ou link público.

## Estratégia de Lançamento Gradual (Phased Release)

Depois que seu build passar na revisão e você estiver pronto para lançar, considere habilitar o phased release no App Store Connect. O lançamento gradual distribui a atualização progressivamente ao longo de sete dias:

- Dias 1 a 2: 1% dos usuários recebem a atualização
- Dia 3: 2% dos usuários
- Dia 4: 5% dos usuários
- Dia 5: 10% dos usuários
- Dia 6: 20% dos usuários
- Dia 7: 50% dos usuários
- Dia 8: 100% dos usuários

Você pode pausar o rollout em qualquer estágio se o monitoramento revelar taxas elevadas de crash ou comportamento inesperado. Pausar impede que novos dispositivos recebam a atualização sem removê-la dos dispositivos que já a instalaram.

O phased release se aplica apenas a atualizações automáticas. Usuários que verificam atualizações manualmente na App Store recebem a nova versão imediatamente, independentemente da fase.

Para apps React Native, o phased release funciona bem em conjunto com a capacidade de atualização OTA. Você pode lançar uma atualização de binário com rollout gradual e então usar atualizações OTA para entregar hotfixes rápidos aos usuários que já receberam o novo binário.

## Checklist Pré-Submissão

Antes de fazer o upload de um build para revisão:

- Execute um relatório de privacidade no Xcode e confirme que todas as APIs com razões obrigatórias possuem declarações
- Verifique se `PrivacyInfo.xcprivacy` está no target correto e aparece no bundle do archive
- Confirme que `NSPrivacyCollectedDataTypes` reflete todos os dados que seu app realmente coleta
- Valide que cada chave de descrição de uso de permissão no `Info.plist` possui um prompt correspondente no app
- Teste o archive em um dispositivo físico antes de fazer o upload
- Distribua via testes externos do TestFlight e colete feedback antes da submissão completa
- Configure a data de lançamento e a preferência de phased release no App Store Connect antes de submeter para revisão

Atender minuciosamente aos requisitos do privacy manifest elimina a categoria mais comum de rejeições de apps React Native na App Store. Trate o manifest como um documento vivo: atualize-o sempre que adicionar uma dependência nativa que acesse novas APIs com razões obrigatórias.
