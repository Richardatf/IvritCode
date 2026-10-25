using System;
using System.Collections.Generic;
using UnityEngine;

namespace IvritCode.Scripts
{
    [Serializable]
    public class ScriptRegistry
    {
        public string schema;
        public string version;
        public string description;
        public LetterEntry[] letters;
        public MetaStates meta_states;

        public LetterEntry FindByToken(string token)
        {
            if (letters == null || string.IsNullOrWhiteSpace(token)) return null;
            foreach (var letter in letters)
                if (string.Equals(letter.machine_token, token, StringComparison.OrdinalIgnoreCase))
                    return letter;
            return null;
        }
    }

    [Serializable]
    public class LetterEntry
    {
        public string id;
        public int index;
        public string name;
        public string hebrew_name;
        public int gematria;
        public string transliteration;
        public string machine_token;
        public Representations representations;
    }

    [Serializable]
    public class Representations
    {
        public ScriptForm MODERN;
        public ScriptForm PALEO;
        public ScriptForm PROTO;
        public ScriptForm RECOVERED;
    }

    [Serializable]
    public class ScriptForm
    {
        public string glyph;
        public string final_glyph;
        public string unicode;
        public string unicode_name;
        public string glyph_id;
        public string authoring_tag;
        public string status;
        public string confidence;
    }

    [Serializable]
    public class MetaStates
    {
        public AlephOlam ALEPH_OLAM;
    }

    [Serializable]
    public class AlephOlam
    {
        public string id;
        public string name;
        public string type;
        public bool is_hebrew_letter;
        public bool historical_script_member;
        public string description;
    }

    public static class IvritCodeScriptRegistry
    {
        public static ScriptRegistry Load(TextAsset registryJson)
        {
            if (registryJson == null)
                throw new ArgumentNullException(nameof(registryJson));

            var registry = JsonUtility.FromJson<ScriptRegistry>(registryJson.text);
            if (registry == null || registry.letters == null || registry.letters.Length != 22)
                throw new InvalidOperationException("Invalid IvritCode script registry: expected exactly 22 canonical letters.");

            return registry;
        }

        public static string Render(LetterEntry letter, string script = "MODERN", bool finalForm = false)
        {
            if (letter == null || letter.representations == null) return string.Empty;

            ScriptForm form;
            switch ((script ?? "MODERN").ToUpperInvariant())
            {
                case "PALEO": form = letter.representations.PALEO; break;
                case "PROTO": form = letter.representations.PROTO; break;
                case "RECOVERED": form = letter.representations.RECOVERED; break;
                default: form = letter.representations.MODERN; break;
            }

            if (form == null) return string.Empty;
            if (finalForm && !string.IsNullOrEmpty(form.final_glyph)) return form.final_glyph;
            if (!string.IsNullOrEmpty(form.glyph)) return form.glyph;
            if (!string.IsNullOrEmpty(form.authoring_tag)) return form.authoring_tag;
            return form.glyph_id ?? string.Empty;
        }
    }
}
