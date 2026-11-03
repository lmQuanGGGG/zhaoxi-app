import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth } from "../api/client";
import type { ChatAttachment } from "../api/types";
import { API_URL } from "../config";
import { colors, shadow } from "../theme";
import { Ionicons } from "../ui";

/** A photo in a bubble: either still on the device (sending) or on the backend. */
export type BubblePhoto = { key: string; uri: string; width: number | null; height: number | null; remote: boolean };

export function remotePhotos(attachments: ChatAttachment[] = []): BubblePhoto[] {
  return attachments.map((a) => ({ key: a.id, uri: `${API_URL}${a.url}`, width: a.width, height: a.height, remote: true }));
}

/** Chat photos are private: the backend only serves them with the viewer's token. */
function source(photo: BubblePhoto) {
  const token = getAuth()?.accessToken;
  return photo.remote && token ? { uri: photo.uri, headers: { authorization: `Bearer ${token}` }, cacheKey: photo.key } : { uri: photo.uri };
}

const CELL = 108;
const GAP = 4;

/** One photo shows at its own shape; several sit in a 2-column grid of squares. */
export function PhotoGrid({ photos, onOpen, dim = false }: { photos: BubblePhoto[]; onOpen: (index: number) => void; dim?: boolean }) {
  if (!photos.length) return null;
  if (photos.length === 1) {
    const [photo] = photos;
    const ratio = photo.width && photo.height ? photo.height / photo.width : 0.75;
    const width = CELL * 2 + GAP;
    return (
      <Pressable onPress={() => onOpen(0)} style={[styles.single, { width, height: Math.min(300, Math.max(140, width * ratio)) }, dim && styles.dim]}>
        <Image source={source(photo)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" />
      </Pressable>
    );
  }
  return (
    <View style={[styles.grid, dim && styles.dim]}>
      {photos.map((photo, index) => (
        <Pressable key={photo.key} onPress={() => onOpen(index)} style={[styles.cell, photos.length % 2 === 1 && index === photos.length - 1 && { width: CELL * 2 + GAP }]}>
          <Image source={source(photo)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        </Pressable>
      ))}
    </View>
  );
}

/** Full-screen, swipeable viewer. */
export function PhotoViewer({ photos, index, onClose }: { photos: BubblePhoto[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const open = index !== null && photos.length > 0;
  return (
    <Modal visible={open} animationType="fade" presentationStyle="overFullScreen" transparent onRequestClose={onClose} onShow={() => setCurrent(index || 0)}>
      <View style={styles.viewer}>
        {open ? (
          <FlatList
            data={photos}
            keyExtractor={(photo) => photo.key}
            horizontal
            pagingEnabled
            initialScrollIndex={index || 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setCurrent(Math.round(event.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Image source={source(item)} style={{ width, height }} contentFit="contain" cachePolicy="memory-disk" />}
          />
        ) : null}
        <View style={[styles.viewerBar, { top: insets.top + 8 }]}>
          <Text style={styles.viewerCount}>{photos.length > 1 ? `${current + 1}/${photos.length}` : ""}</Text>
          <Pressable accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.viewerClose}>
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Photos picked for the next message, each removable. */
export function DraftStrip({ photos, onRemove }: { photos: { key: string; uri: string }[]; onRemove: (key: string) => void }) {
  if (!photos.length) return null;
  return (
    <View style={styles.drafts}>
      {photos.map((photo) => (
        <View key={photo.key} style={styles.draft}>
          <View style={styles.draftShadow}>
            <Image source={{ uri: photo.uri }} style={styles.draftImage} contentFit="cover" />
          </View>
          <Pressable accessibilityLabel="Remove" hitSlop={8} onPress={() => onRemove(photo.key)} style={styles.draftRemove}>
            <Ionicons name="close" size={12} color={colors.white} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { borderRadius: 16, overflow: "hidden", backgroundColor: colors.bgSoft },
  grid: { width: CELL * 2 + GAP, flexDirection: "row", flexWrap: "wrap", gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 12, overflow: "hidden", backgroundColor: colors.bgSoft },
  dim: { opacity: 0.6 },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)" },
  viewerBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewerCount: { color: colors.white, fontSize: 14, fontWeight: "700" },
  viewerClose: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  drafts: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  draft: { width: 56, height: 56 },
  draftShadow: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.white, ...shadow("card") },
  draftImage: { width: 56, height: 56, borderRadius: 12 },
  draftRemove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(15,23,42,0.85)", alignItems: "center", justifyContent: "center" },
});
