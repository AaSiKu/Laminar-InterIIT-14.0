from huggingface_hub import InferenceClient

class QwenSummarizer:
    def __init__(self, hf_token):
        self.client = InferenceClient(token=hf_token)
        
    def summarize(self, text, max_length=200):
        
        messages = [
            {"role": "system", "content": "Provide concise summaries."},
            {"role": "user", "content": f"Summarize:\n\n{text}"}
        ]
        
        response = self.client.chat_completion(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=messages,
            max_tokens=max_length,
            temperature=0.7
        )
        
        return response.choices[0].message.content


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    hf_token = os.getenv("hf_token")
    summarizer = QwenSummarizer(hf_token)
    text = '''
    One of the important applications of the Laplace transform is in the analysis and characterization of LTI systems. Its role for this class of systems stems directly from the convolution
property (Section 9.5.6). Specifically, the Laplace transforms of the input and output of an
LTI system are related through multiplication by the Laplace transform of the impulse
response of the system. Thus,
Y(s) = H(s)X(s). (9.112)
where X(s), Y(s), and H(s) are the Laplace transforms of the input, output, and
impulse response of the system, respectively. Equation (9.112) is the counterpart, in
the context of Laplace transforms, of eq. (4.56) for Fourier transform. Also, from our
discussion in Section 3.2 on the response of LTI systems to complex exponentials, if the
input to an LTI system is x(t) = es1, with sin the ROC of H(s), then the output will be
H(s)est; i.e., est is an eigenfunction of the system with eigenvalue equal to the Laplace
transform of the impulse response.
If the ROC of H(s) includes the imaginary axis, then for s = jw, H(s) is the
frequency response of the LTI system. In the broader context of the Laplace
transform, H(s) is commonly referred to as the system function or, alternatively, the
transfer function. Many properties of LTI systems can be closely associated with the
characteristics of the system function in the s-plane. We illustrate this next by
examining several important properties and classes of systems.
9. 7. 1 Causality
For a causal LTI system, the impulse response is zero for t < 0 and thus is right sided.
Consequently, from the discussion in Section 9.2, we see that
The ROC associated with the system function for a
causal system is a right-half plane.
It should be stressed, however, that the converse of this statement is not necessarily
true. That is, as illustrated in Example 9.19 to follow, an ROC to the right of the rightmost694 The Laplace Transform Chap.9
pole does not guarantee that a system is causal; rather, it guarantees only that the impulse
response is right sided. However, if H (s) is rational, then, as illustrated in Examples 9.17
and 9.18 to follow, we can determine whether the system is causal simply by checking to
see if its ROC is a right-half plane. Specifically,
For a system with a rational system function, causality
of the system is equivalent to the ROC being the
right-half plane to the right of the rightmost pole.
    '''
    print(summarizer.summarize(text))