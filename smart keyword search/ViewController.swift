//
//  ViewController.swift
//  smart keyword search
//
//  Created by Reinoud Elhorst on 2020-0015.
//

import Cocoa
import SafariServices.SFSafariApplication
import SafariServices.SFSafariExtensionManager

let appName = "Smart Keyword Search"
let extensionBundleIdentifier = "nl.claude.smart-keyword-search.Extension"

class ViewController: NSViewController {

    @IBOutlet var appNameLabel: NSTextField!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.appNameLabel.stringValue = appName
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                if (state.isEnabled) {
                    self.appNameLabel.stringValue = "The \(appName) extension is installed and switched on in safari."
                } else {
                    self.appNameLabel.stringValue = "The \(appName) extension is installed, but switched off in Safari. You can turn it on in Safari Extensions preferences."
                }
            }
        }
    }

    @IBAction func showHelp(_ sender: Any?) {
        NSWorkspace.shared.open(URL(string: "https://d1agrx7y9zlyta.cloudfront.net")!)
    }

    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
    }

}
