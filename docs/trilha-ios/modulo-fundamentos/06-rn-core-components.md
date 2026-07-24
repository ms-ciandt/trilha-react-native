The file has been written to `C:\Users\gbonin\desktop\trilha-react-native\docs\trilha-ios\modulo-fundamentos\06-rn-core-components.md`.

Here is the raw markdown content that was written:

---
title: RN Core Components — UIKit and SwiftUI Mapping
---

The file covers all requested topics:

- **Comprehensive mapping table** at the top listing all 12 component pairs (UILabel/Text, UIImageView/Image, UIButton/Button → Pressable/TouchableOpacity, UIScrollView → ScrollView, UITableView/List → FlatList, UICollectionView → FlatList with numColumns, UIStackView V/H / VStack/HStack → View with flexDirection, UITextField/TextField → TextInput, UISwitch/Toggle → Switch, UIActivityIndicatorView/ProgressView → ActivityIndicator, SafeAreaView, StatusBar)
- **Per-component sections** with Swift/UIKit analogy explanations and key prop tables
- **Pressable with hitSlop** explained as the equivalent of `UIButton.contentEdgeInsets` for expanding tap targets
- **FlatList vs UITableView cell reuse** in depth — registers/dequeue pattern compared to renderItem, getItemLayout optimization, numColumns for UICollectionView-style grids
- **KeyboardAvoidingView** compared to UIKit's `keyboardWillShowNotification` pattern and SwiftUI's automatic keyboard avoidance
- No emojis, no video section, frontmatter with title only, approximately 390 lines
