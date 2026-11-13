# Add project specific ProGuard rules here.
-keep class com.musicplayer.app.** { *; }
-keepclassmembers class * {
    @uniffi.* <methods>;
}
