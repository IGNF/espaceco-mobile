package fr.ign.guichet;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

/**
 * Serveur RFCOMM Bluetooth Classic (SPP) hébergé par le device.
 *
 * Nécessaire pour les récepteurs GNSS qui ne savent émettre qu'en se connectant
 * vers un port COM Bluetooth SORTANT (ex. GeoXT — sortie NMEA
 * sur « Bluetooth (COM9) »). Dans ce cas le récepteur est client : le device
 * doit donc écouter en tant que serveur.
 *
 * On utilise une socket INSÉCURE (listenUsingInsecureRfcommWithServiceRecord) afin
 * d'accepter la connexion même sans appairage (bond) préalable, ce que beaucoup de
 * vieux terminaux Windows Mobile ne parviennent pas à établir avec Android moderne.
 *
 * Les données reçues sont renvoyées au JS via l'évènement « onRead » ({ value: String }),
 * pour réutiliser le même pipeline de parsing NMEA que le mode client.
 */
@CapacitorPlugin(name = "SppServer")
public class SppServerPlugin extends Plugin {

    private static final String TAG = "SppServer";
    /** UUID du profil Serial Port Profile (SPP) standard. */
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final String SDP_NAME = "EspaceCoGNSS";

    private BluetoothServerSocket serverSocketSecure;
    private BluetoothServerSocket serverSocketInsecure;
    private BluetoothSocket clientSocket;
    private Thread serverThreadSecure;
    private Thread serverThreadInsecure;
    private volatile boolean running = false;
    private final Object connectLock = new Object();

    @PluginMethod
    public void start(PluginCall call) {
        if (running) {
            call.resolve();
            return;
        }

        // Android 12+ : la création d'une socket serveur exige BLUETOOTH_CONNECT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission BLUETOOTH_CONNECT manquante");
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Bluetooth non disponible sur cet appareil");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth désactivé");
            return;
        }

        try {
            serverSocketSecure = adapter.listenUsingRfcommWithServiceRecord(SDP_NAME, SPP_UUID);
        } catch (IOException e) {
            Log.w(TAG, "Socket sécurisée indisponible : " + e.getMessage());
            serverSocketSecure = null;
        }
        try {
            serverSocketInsecure = adapter.listenUsingInsecureRfcommWithServiceRecord(SDP_NAME, SPP_UUID);
        } catch (IOException e) {
            Log.w(TAG, "Socket insécurisée indisponible : " + e.getMessage());
            serverSocketInsecure = null;
        }
        if (serverSocketSecure == null && serverSocketInsecure == null) {
            call.reject("Impossible d'ouvrir une socket serveur (secure et insecure)");
            return;
        }

        running = true;
        if (serverSocketSecure != null) {
            serverThreadSecure = new Thread(() -> acceptLoop(serverSocketSecure, "secure"), "spp-server-secure");
            serverThreadSecure.start();
        }
        if (serverSocketInsecure != null) {
            serverThreadInsecure = new Thread(() -> acceptLoop(serverSocketInsecure, "insecure"), "spp-server-insecure");
            serverThreadInsecure.start();
        }
        Log.i(TAG, "Serveur SPP démarré (secure=" + (serverSocketSecure != null)
                + ", insecure=" + (serverSocketInsecure != null) + "), en attente de connexion…");
        try {
            Log.i(TAG, "Nom Bluetooth de ce device : « " + adapter.getName() + " »");
        } catch (SecurityException ignored) {}
        emitStatus("listening", null);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        closeAll();
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", running);
        call.resolve(ret);
    }

    /**
     * Rend le device découvrable (visible) en Bluetooth pendant une durée donnée,
     * afin que le récepteur puisse le trouver pour configurer son port COM
     * sortant et s'y connecter. Affiche le dialogue système de demande de visibilité.
     */
    @PluginMethod
    public void makeDiscoverable(PluginCall call) {
        int duration = call.getInt("duration", 300); // secondes (max 300 sur la plupart des appareils)
        try {
            Intent intent = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
            intent.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, duration);
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Impossible de rendre l'appareil découvrable : " + e.getMessage());
        }
    }

    /**
     * Diagnostic : liste les appareils Bluetooth appairés (bondés) avec le device.
     * Permet de vérifier si le récepteur a réussi son appairage : tant qu'il
     * n'apparaît pas ici, son port COM sortant ne pourra pas cibler ce device.
     */
    @PluginMethod
    public void listBonded(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permission BLUETOOTH_CONNECT manquante");
            return;
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Bluetooth non disponible");
            return;
        }
        JSArray devices = new JSArray();
        try {
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            if (bonded != null) {
                for (BluetoothDevice d : bonded) {
                    JSObject o = new JSObject();
                    o.put("name", d.getName());
                    o.put("address", d.getAddress());
                    o.put("bondState", d.getBondState());
                    devices.put(o);
                    Log.i(TAG, "Appairé : " + d.getName() + " [" + d.getAddress() + "]");
                }
            }
        } catch (SecurityException e) {
            call.reject("Accès refusé aux appareils appairés : " + e.getMessage());
            return;
        }
        JSObject ret = new JSObject();
        ret.put("devices", devices);
        call.resolve(ret);
    }

    /** Boucle d'acceptation + lecture du flux entrant (un thread par socket : secure / insecure). */
    private void acceptLoop(BluetoothServerSocket server, String label) {
        byte[] buffer = new byte[1024];

        while (running) {
            BluetoothSocket socket;
            try {
                // Bloque jusqu'à ce qu'un client (le GNSS) se connecte.
                socket = server.accept();
            } catch (IOException e) {
                if (running) Log.w(TAG, "accept(" + label + ") interrompu : " + e.getMessage());
                break;
            }

            // Premier arrivé, premier servi : on ignore une 2e connexion concurrente.
            synchronized (connectLock) {
                if (clientSocket != null) {
                    Log.i(TAG, "Connexion " + label + " ignorée (déjà connecté)");
                    closeQuietly(socket);
                    continue;
                }
                clientSocket = socket;
            }

            String remote = safeRemoteName(socket);
            Log.i(TAG, "Client connecté (" + label + ") : " + remote);
            emitStatus("connected", remote);

            try (InputStream in = socket.getInputStream()) {
                int n;
                while (running && (n = in.read(buffer)) != -1) {
                    if (n == 0) continue;
                    String chunk = new String(buffer, 0, n, StandardCharsets.US_ASCII);
                    JSObject data = new JSObject();
                    data.put("value", chunk);
                    notifyListeners("onRead", data);
                }
            } catch (IOException e) {
                Log.w(TAG, "Lecture interrompue (" + label + ") : " + e.getMessage());
            } finally {
                emitStatus("disconnected", remote);
                closeQuietly(socket);
                synchronized (connectLock) {
                    if (clientSocket == socket) clientSocket = null;
                }
            }
            // Le GNSS peut se reconnecter : on boucle et on ré-accepte tant que running.
        }
    }

    private String safeRemoteName(BluetoothSocket socket) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT)
                    != PackageManager.PERMISSION_GRANTED) {
                return socket.getRemoteDevice().getAddress();
            }
            String name = socket.getRemoteDevice().getName();
            return name != null ? name : socket.getRemoteDevice().getAddress();
        } catch (SecurityException e) {
            return "?";
        }
    }

    private void emitStatus(String state, String device) {
        JSObject ev = new JSObject();
        ev.put("state", state);
        if (device != null) ev.put("device", device);
        notifyListeners("onStatus", ev);
    }

    private void closeAll() {
        running = false;
        closeQuietly(clientSocket);
        clientSocket = null;
        BluetoothServerSocket s1 = serverSocketSecure;
        serverSocketSecure = null;
        if (s1 != null) {
            try { s1.close(); } catch (IOException ignored) {}
        }
        BluetoothServerSocket s2 = serverSocketInsecure;
        serverSocketInsecure = null;
        if (s2 != null) {
            try { s2.close(); } catch (IOException ignored) {}
        }
        if (serverThreadSecure != null) {
            serverThreadSecure.interrupt();
            serverThreadSecure = null;
        }
        if (serverThreadInsecure != null) {
            serverThreadInsecure.interrupt();
            serverThreadInsecure = null;
        }
        Log.i(TAG, "Serveur SPP arrêté");
    }

    private void closeQuietly(BluetoothSocket socket) {
        if (socket != null) {
            try { socket.close(); } catch (IOException ignored) {}
        }
    }

    @Override
    protected void handleOnDestroy() {
        closeAll();
        super.handleOnDestroy();
    }
}
