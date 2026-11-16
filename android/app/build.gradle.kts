import java.io.File

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.musicplayer.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.musicplayer.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Android Auto requires automotive feature declaration.
        // The Play Store uses this to filter compatible devices.
    }

    // Split per-ABI for smaller downloads.
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a", "x86", "x86_64")
            isUniversalApk = false
        }
    }

    // CI signing: the workflow extracts the keystore into android/.signing and
    // exports KS_FILE / KS_PWD / KEY_ALIAS / KEY_PWD. When present, both the
    // split APKs and the AAB are signed natively by Gradle (so `app-release.aab`
    // is genuinely signed, not unsigned). Without the env vars (local builds,
    // no-secrets CI) the release build stays unsigned — same as before.
    val ksPath: String? = System.getenv("KS_FILE")
    val ksReady: Boolean = !ksPath.isNullOrBlank() && File(ksPath).exists()

    signingConfigs {
        if (ksReady) {
            create("ci") {
                storeFile = File(ksPath!!)
                storePassword = System.getenv("KS_PWD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PWD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (ksReady) {
                signingConfig = signingConfigs.getByName("ci")
            }
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        // The generated UniFFI bindings (app/src/main/kotlin/uniffi/) call
        // java.lang.ref.Cleaner behind a Class.forName runtime guard with a
        // JNA fallback for pre-API-33 devices — lint cannot see the guard and
        // flags NewApi. Safe to disable: our hand-written code does not use
        // any version-gated APIs.
        disable += "NewApi"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
    implementation(libs.androidx.media3.common)
    implementation(libs.androidx.media3.ui)
    implementation(libs.coil.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)

    // UniFFI-generated Kotlin bindings for the Rust audio engine use JNA
    // (com.sun.jna) to talk to the native cdylib. The @aar artifact ships
    // the Android JNI glue.
    implementation("net.java.dev.jna:jna:5.14.0@aar")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
