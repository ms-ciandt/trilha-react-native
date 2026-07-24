---
title: List Performance — iOS
---

# List Performance — iOS Developer Trail

As an iOS developer, you have spent time understanding why `dequeueReusableCell(withReuseIdentifier:for:)` exists. The answer is simple: allocating and laying out a new cell for every row in a large dataset destroys frame rate. UITableView solves this by keeping an off-screen pool of cells and reusing them. React Native's FlatList applies the same principle through JavaScript-controlled virtualization, and FlashList takes that idea further by implementing it natively through Fabric.

Understanding the parallel between the two approaches lets you make informed decisions about which API to reach for and how to configure it correctly.

---

## Virtualization: the concept

UITableView never holds all your data rows in memory as live views simultaneously. It asks the data source for cells only as rows approach the visible region, and it recycles cells that scroll off screen.

FlatList does the same thing in JavaScript. The component maintains a render window — a region larger than the visible viewport — and only mounts `renderItem` output for rows within that window. Rows outside the window are unmounted and their memory is released. As the user scrolls, the window moves and new items mount on the leading edge while trailing items unmount.

The window is measured in viewport-height units. A `windowSize` of 5 means the rendered region is 5 viewport heights tall: 2 above the visible area, the visible area itself, and 2 below. At the default value of 21 you trade memory for smoother scroll-ahead.

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  windowSize={5}        // tighter window, lower memory usage
  initialNumToRender={10}
  maxToRenderPerBatch={5}
/>
```

This is not a free parameter to tune blindly. A smaller window means more frequent mount/unmount cycles, which costs JS thread time. A larger window keeps more components alive in memory. The right value depends on your item complexity and target device.

---

## removeClippedSubviews

On Android this prop causes off-screen items to be detached from the native view hierarchy while remaining mounted in the JS tree. On iOS the effect is less dramatic because UIKit handles view recycling differently at the OS level, but the prop is still meaningful: it signals to React Native's layout system that clipped views can be excluded from certain traversals.

For long lists on iOS, enable it alongside a tuned `windowSize`:

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  removeClippedSubviews={true}
  windowSize={7}
/>
```

Do not combine a very small `windowSize` with `removeClippedSubviews` without testing on a real device. The interaction can cause blank flashes when scrolling faster than the JS thread can mount new items.

---

## keyExtractor — the reuseIdentifier equivalent

In UITableView you register a cell class with an identifier string and the table view uses that string to look up reusable cells of the correct type. FlatList's `keyExtractor` serves the same structural role: it produces a stable string key for each data item so that React's reconciler can match existing component instances to updated data positions.

Without a stable key, React cannot tell whether a reordered item should update an existing component or mount a new one. The result is incorrect diffs, missed updates, or unnecessary re-renders.

```tsx
// Correct: stable, unique, based on data identity
keyExtractor={(item) => item.id.toString()}

// Wrong: index-based keys break when items are inserted or removed
keyExtractor={(item, index) => index.toString()}
```

The parallel to `reuseIdentifier` goes further: just as you register different identifiers for cells with different layouts, if your list renders heterogeneous item types you should encode the type into the key to prevent the wrong component from being reused for an incompatible data shape.

---

## getItemLayout — eliminating layout measurement

UITableView has `estimatedRowHeight` and `rowHeight(at:)`. When you return a fixed value from `rowHeight(at:)`, the table view skips the measurement pass entirely and can jump directly to any row using arithmetic — `offset = index * rowHeight`.

FlatList's `getItemLayout` does the same. Without it, FlatList must mount and measure every item from the top of the list before it can scroll to a specific index. With it, navigation to any row is O(1).

```tsx
const ITEM_HEIGHT = 72;
const SEPARATOR_HEIGHT = 1;

<FlatList
  data={items}
  renderItem={renderItem}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
    index,
  })}
/>
```

`getItemLayout` is only correct when item heights are known and fixed. If items have dynamic content — user-supplied text, images with unknown aspect ratios — you cannot use it reliably. Attempting to return incorrect values causes FlatList to scroll to wrong positions.

When heights vary but you still want to support `scrollToIndex`, measure items in `onLayout` and cache the results. This is more expensive but avoids the position errors that incorrect `getItemLayout` values produce.

---

## Inline anonymous functions in renderItem

This is a direct analogue of a common Swift mistake. In `cellForRow(at:)` you should not create new closures inside the method body and assign them as button targets without careful handling, because each call produces a new allocation and can interfere with cell reuse. In FlatList the same pattern has the same cost.

```tsx
// Wrong: creates a new function reference on every render of the parent
<FlatList
  data={items}
  renderItem={({ item }) => (
    <ItemRow item={item} onPress={() => handlePress(item.id)} />
  )}
/>
```

When the parent re-renders, the inline arrow function is a new reference. React sees a changed `renderItem` prop and re-renders the entire list. For lists with dozens of items this produces unnecessary work.

The fix is to define `renderItem` outside the component body or memoize it:

```tsx
const renderItem = useCallback(
  ({ item }: { item: Item }) => (
    <ItemRow item={item} onPress={handlePress} />
  ),
  [handlePress]
);

// ItemRow receives onPress and uses item.id internally
const handlePress = useCallback((id: string) => {
  // handle press
}, []);
```

The stable function reference means React can skip re-rendering list items that have not changed, provided `ItemRow` is wrapped in `React.memo`.

```tsx
const ItemRow = React.memo(({ item, onPress }: ItemRowProps) => {
  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Text>{item.title}</Text>
    </Pressable>
  );
});
```

---

## FlatList performance props reference

| Prop | Default | Effect |
|---|---|---|
| `windowSize` | 21 | Rendered window in viewport-height multiples. Lower = less memory, more mount/unmount. |
| `initialNumToRender` | 10 | Items rendered on first pass. Set to the number visible without scrolling. |
| `maxToRenderPerBatch` | 10 | Items added per incremental render batch. Lower reduces JS thread spikes. |
| `updateCellsBatchingPeriod` | 50 | Milliseconds between batch renders. Increase to reduce render frequency. |
| `removeClippedSubviews` | false | Detach off-screen native views. Useful on Android; marginal on iOS. |
| `getItemLayout` | undefined | Provide for fixed-height rows to skip measurement and enable fast `scrollToIndex`. |
| `keyExtractor` | required | Stable string key per item. Use data identity, never index. |
| `onEndReachedThreshold` | 0.5 | Fraction of list remaining when `onEndReached` fires. |

---

## SectionList vs UITableView sections

UITableView sections map naturally to SectionList. The component accepts an array of section objects, each with a header and an array of data items. It supports fixed section headers that pin to the top of the visible area during scroll, matching UITableView's default sticky section header behavior.

```tsx
type Section = {
  title: string;
  data: Item[];
};

<SectionList
  sections={sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemRow item={item} />}
  renderSectionHeader={({ section }) => (
    <View style={styles.header}>
      <Text style={styles.headerText}>{section.title}</Text>
    </View>
  )}
  stickySectionHeadersEnabled={true}
/>
```

SectionList inherits all of FlatList's virtualization behavior. The same `windowSize`, `getItemLayout`, and `keyExtractor` considerations apply. For `getItemLayout` with sections you must account for the section header heights in the offset calculation, which requires knowing both item height and header height at every position. Libraries like `react-native-section-list-get-item-layout` automate this calculation.

---

## FlashList — the recommended replacement

FlashList is developed by Shopify and is the practical replacement for FlatList in performance-sensitive screens. It ships as a Fabric native component, meaning it runs the recycling logic on the native side rather than in JavaScript. The result is measurably lower JS thread load and smoother frame rates on complex lists.

The performance difference is most visible on mid-tier Android devices, but iOS benefits as well, particularly on lists with many items or complex cell layouts.

FlashList's API is intentionally compatible with FlatList. Migration is usually a prop rename and the addition of `estimatedItemSize`:

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  estimatedItemSize={72}
/>
```

`estimatedItemSize` is the equivalent of `estimatedRowHeight` in UITableView. It does not need to be exact, but a value close to the actual height reduces layout recalculations on first render. FlashList uses it to estimate total list height for scroll indicator sizing.

FlashList implements native cell recycling. When an item scrolls off screen, FlashList reuses the native view for the next incoming item rather than unmounting and remounting a React component. This is architecturally identical to UITableView's `dequeueReusableCell` pool. The JS component mounted in the recycled view receives updated props, and React reconciles only the changed values.

The implication is the same as it is in UIKit: your item component must handle prop changes correctly and must not hold local state that should reset when the item represents a different data record. In UITableView you call `prepareForReuse()` to clear cell state. In FlashList you ensure that all visual state derives from props, not from internal `useState` that persists across recycling.

```tsx
// Wrong: local state survives recycling and shows stale values
const ItemRow = ({ item }: { item: Item }) => {
  const [expanded, setExpanded] = useState(false); // persists across reuse
  return ...;
};

// Correct: controlled state, or reset via key if truly item-local
const ItemRow = ({ item, isExpanded, onToggle }: ItemRowProps) => {
  return ...;
};
```

Install FlashList with Expo:

```bash
npx expo install @shopify/flash-list
```

No additional native configuration is required when using Expo SDK 50 or later. FlashList is automatically linked through Expo Modules.

---

## Choosing between FlatList and FlashList

FlatList is part of React Native core and requires no additional dependency. It is appropriate for short lists (under 100 items), lists where items change infrequently, and cases where adding a dependency is not justified.

FlashList is appropriate for lists that are the primary UI of a screen, contain many items, update frequently, or profile as a frame-rate bottleneck. The migration cost is low and the performance ceiling is significantly higher.

SectionList does not yet have a FlashList equivalent with full feature parity. If you need sections and high performance, one option is to flatten your sectioned data into a single array and render section headers as items distinguished by a type field, then pass that array to FlashList with a `renderItem` that branches on type.

---

## Profiling list performance

Xcode Instruments and the React DevTools Profiler are both useful here.

In the React DevTools Profiler, render the list and scroll it. Look at the flame chart for your item component. If it appears on every frame, your `renderItem` is not memoized or your `keyExtractor` is unstable.

In Xcode Instruments with Time Profiler, look for JS thread activity correlated with scroll events. High JS thread load during smooth-looking scroll indicates that your `windowSize` is causing frequent remounts. Lower it and measure again.

FlashList includes a built-in performance warning in development mode. If your `estimatedItemSize` is significantly wrong it logs a corrected value. Update the prop to match and re-measure.

For lists that must scroll to arbitrary positions programmatically — for example, restoring scroll position after navigation — ensure `getItemLayout` (FlatList) or `estimatedItemSize` plus homogeneous item heights (FlashList) are in place. Without layout knowledge, `scrollToIndex` triggers a full measurement pass from the top of the list.
